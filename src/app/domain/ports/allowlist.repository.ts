// Lista de acceso anticipado: un correo entra solo si su entrada existe. La comparación es literal
// (mayúsculas incluidas). Se puede consultar con o sin sesión; nunca se escribe desde la app.
export abstract class AllowlistRepository {
  abstract isAllowed(email: string): Promise<boolean>;
}
