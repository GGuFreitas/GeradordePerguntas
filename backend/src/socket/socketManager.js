// Módulo singleton que guarda a instância do Socket.io
// Permite que o worker acesse o io sem criar dependência circular
let _io = null;

function initSocket(io) {
  _io = io;
}

function getIO() {
  if (!_io) throw new Error('Socket.io ainda não foi inicializado.');
  return _io;
}

module.exports = { initSocket, getIO };
