function getIPCliente(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    ""
  );
}

function grabarLog(canal, tipo, script, host, port, ip, protocol, method, hostHeader, url, status, accion, detalle) {
  const linea = [
    new Date().toISOString(),
    canal,
    tipo,
    script,
    host + ":" + port,
    ip,
    protocol,
    method,
    hostHeader,
    url,
    status,
    accion,
    detalle,
  ].join(" | ");
  console.log(linea);
}

module.exports = {
  getIPCliente,
  grabarLog,
};
