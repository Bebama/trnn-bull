// Configuración local TRNN BULL CrossFit (sin secretos de COSTES).
// Puerto sobrescribible con PORT.
//
// Usuarios semilla (si data/trnnbull.db está vacío y no hay JSON que importar):
//   superusuario / super123   (rol: superusuario)
//   entrenador / coach123     (rol: entrenador)
//
// SMTP: rellena host/user/pass/from para enviar el código de registro por email.
// Si SMTP está vacío, el código se guarda igual y, con devShowCode=true,
// se devuelve en la respuesta del API para pruebas locales.

module.exports = {
  port: Number(process.env.PORT || 4032),
  boxName: 'TRNN BULL CrossFit',
  // En local muestra el código de verificación en la respuesta del registro
  devShowCode: true,
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: '',
  },
  seedUsers: [
    {
      usuario: 'superusuario',
      password: 'super123',
      nombre: 'Admin',
      apellidos: 'TRNN',
      email: 'super@trnnbull.local',
      telefono: '600000001',
      rol: 'superusuario',
      status: 'valido',
      emailVerified: true,
    },
    {
      usuario: 'entrenador',
      password: 'coach123',
      nombre: 'Coach',
      apellidos: 'Bull',
      email: 'coach@trnnbull.local',
      telefono: '600000002',
      rol: 'entrenador',
      status: 'valido',
      emailVerified: true,
    },
  ],
};
