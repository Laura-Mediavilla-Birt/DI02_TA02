import { Component, signal, computed, inject } from '@angular/core';
import restaurantesJSON from '../../assets/datos/restaurantes.json';
import { IonicModule } from '@ionic/angular';
import { ToastController} from '@ionic/angular';
// DI02_TA02 - Permite mostrar un indicador de carga
// mientras se cargan o importan los restaurantes.
import { LoadingController } from '@ionic/angular';
import { Restaurante } from '../interface/restaurante';
// DI02_TA02 - Añadimos AlertController para mostrar alertas al usuario
import { AlertController } from '@ionic/angular/standalone';
// DI02_TA02 - Servicio para trabajar con Firebase Firestore
import { RestauranteService } from '../services/restaurante.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonicModule],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage {

  // DI02_TA02 - Inyectamos los controladores y el servicio de Firebase
  private toastController = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private restauranteService = inject(RestauranteService);

  // Lista completa de restaurantes leída del JSON local
  restaurantes: Restaurante[] = restaurantesJSON as Restaurante[];

  // Signal principal con los restaurantes actualmente cargados
  restaurantesCargados = signal<Restaurante[]>([]);

  // DI02_TA02 - Señales para controlar las operaciones de Firebase
  importando = signal(false);
  cargando = signal(false);

  // Indica si hay al menos un restaurante cargado
  hayDatos = computed(() => this.restaurantesCargados().length > 0);

  // DI02_TA02 - Cargamos los restaurantes desde Firebase
  async cargarDatos() {
    this.cargando.set(true);
    let loading;

    try {
      // DI02_TA02 - Mostramos un indicador de carga
      loading = await this.loadingCtrl.create({
        message: 'Cargando restaurantes...'
      });
      await loading.present();

      // DI02_TA02 - Obtenemos los datos de Firestore
      const restaurantes = await this.restauranteService.getAll();
      this.restaurantesCargados.set(restaurantes);

      this.limpiarTodosFiltros();

      await this.mostrarToast(
        `${restaurantes.length} restaurantes cargados`,
        'success'
      );
    } catch (error) {
      // DI02_TA02 - Controlamos los errores de lectura
      console.error('Error al cargar los restaurantes:', error);
      await this.mostrarToast(
        'No se pudieron cargar los restaurantes de Firebase.',
        'danger'
      );
    } finally {
      // DI02_TA02 - Cerramos el indicador de carga
      if (loading) {
        await loading.dismiss();
      }
      this.cargando.set(false);
    }
  }

  // DI02_TA02 - confirmamos antes de sustituir los datos de Firebase
  async confirmarImportacion() {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar importación',
      message: `Se importarán ${this.restaurantes.length} restaurantes. Los datos actuales de Firebase serán borrados y reemplazados con los del archivo local. ¿Deseas continuar?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel'},
        { text: 'Sí, importar', role: 'confirm', handler: () => this.importarJSON() }
      ]
    });

    await alert.present();
  }

  // DI02_TA02 - borramos los datos anteriores e importamos el JSON
  async importarJSON() {
    if (this.importando()) {
      return;
    }

    this.importando.set(true);
    let loading;

    try {
      // DI02_TA02 - Mostramos el indicador mientras se borran los datos anteriores
      loading = await this.loadingCtrl.create({
        message: 'Borrando datos anteriores...',
        backdropDismiss: false
      });
      await loading.present();

      // DI02_TA02 - eliminamos los documentos existentes
      await this.restauranteService.deleteAll();

      // DI02_TA02 - Cambiamos el mensaje del indicador de carga
      loading.message = 'Subiendo restaurantes...';

      // DI02_TA02 - guardamos los restaurantes del JSON en Firestore
      await this.restauranteService.addAll(this.restaurantes);

      await this.mostrarToast(
        `${this.restaurantes.length} restaurantes importados correctamente`,
        'success'
      );
    } catch (error: any) {
      // DI02_TA02 - mostramos los errores de importación
      console.error('Error al importar JSON:', error);
      const msg = error?.code === 'permission-denied'
        ? 'Sin permisos en Firebase. Revisa las reglas de seguridad.'
        : 'Error al importar. Revisa tu conexión a internet.';
      await this.mostrarToast(msg, 'danger');
    } finally {
      // DI02_TA02 - cerramos el indicador y restablecemos la señal
      if (loading) {
        await loading.dismiss();
      }
      this.importando.set(false);
    }
  }

  // Muestra un toast con el mensaje y color indicados
  private async mostrarToast(
    mensaje: string,
    color: 'success' | 'danger' | 'warning'
  ) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom',
      color: color
    });

    await toast.present();
  }

  // ############################### REGION FILTROS ###############################

  textoBusqueda = signal('');

  territorioSeleccionado = signal('');

  localidadesSeleccionadas = signal<string[]>([]);

  // Lista de territorios únicos disponibles, ordenada alfabéticamente
  territoriosFiltrados = computed(() => {
    const territorios = this.restaurantesCargados()
      .map(r => r.territory)
      .filter(t => !!t);

    return Array.from(new Set(territorios)).sort();
  });

  // Actualiza el territorio seleccionado y elimina las localidades no válidas
  onTerritorioChange(value: string) {
    this.territorioSeleccionado.set(value);

    const localidadesValidas = this.localidadesSeleccionadas().filter(
      loc => this.localidadesFiltradasPorTerritorio().includes(loc)
    );

    this.localidadesSeleccionadas.set(localidadesValidas);
  }

  // Lista de localidades únicas del territorio seleccionado
  localidadesFiltradasPorTerritorio = computed(() => {
    let lista: Restaurante[] = this.restaurantesCargados();

    const territorio = this.territorioSeleccionado().toLowerCase().trim();

    if (territorio) {
      lista = lista.filter(
        r => r.territory.toLowerCase().trim() === territorio
      );
    }

    const localidades = lista
      .filter(r => !!r.locality?.trim())
      .map(r => r.locality!.trim());

    return Array.from(new Set(localidades)).sort();
  });

  // Actualiza las localidades seleccionadas
  onLocalidadesChange(value: string[]) {
    this.localidadesSeleccionadas.set(value);
  }

  // Lista filtrada de restaurantes según los filtros activos
  restaurantesFiltrados = computed(() => {
    let lista = this.restaurantesCargados();

    const texto = this.textoBusqueda().toLowerCase().trim();
    const territorio = this.territorioSeleccionado().toLowerCase().trim();
    const localidades = this.localidadesSeleccionadas();

    lista = lista.filter(r => {
      const coincideTexto =
        !texto || r.documentName.toLowerCase().includes(texto);

      const coincideTerritorio =
        !territorio || r.territory.toLowerCase().trim() === territorio;

      
      const coincideLocalidad =
        localidades.length === 0 ||
        localidades.includes(r.locality?.trim() || '');


      return coincideTexto && coincideTerritorio && coincideLocalidad;
    });

    return lista;
  });

  // Devuelve si hay algún filtro activo
  hayFiltrosActivos(): boolean {
    return (
      this.textoBusqueda().trim() !== '' ||
      this.territorioSeleccionado().trim() !== '' ||
      this.localidadesSeleccionadas().length > 0
    );
  }

  // Limpia todos los filtros seleccionados
  limpiarTodosFiltros() {
    this.textoBusqueda.set('');
    this.territorioSeleccionado.set('');
    this.localidadesSeleccionadas.set([]);
  }

  // Devuelve el número de estrellas Michelin
  estrellasMichelin(r: Restaurante): number {
    const estrellas = Number(r.michelinStar);
    return Number.isNaN(estrellas) ? 0 : estrellas;
  }

  // Devuelve el número de soles Repsol
  repsolSoles(r: Restaurante): number {
    const soles = Number(r.repsolSun);
    return Number.isNaN(soles) ? 0 : soles;
  }
}