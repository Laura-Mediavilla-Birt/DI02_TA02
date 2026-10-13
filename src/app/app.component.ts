import { Component, inject } from '@angular/core';

// Importamos los módulos necesarios de Ionic y Firebase
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

// Importamos la configuración de Firebase
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  // Obtenemos el servicio de autenticación
  private auth = inject(Auth);

  constructor() {
    // Recuperamos el correo y la contraseña
    const { email, password } = environment.auth;
    // Iniciamos sesión automáticamente
    signInWithEmailAndPassword(this.auth, email, password)
      .catch(err => console.error('Error al autenticar:', err.message));
  }
}