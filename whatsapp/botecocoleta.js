// botecocoleta.js (corrigido) versão atual 22/12/2025.
// A ideia desta versão é manter o WhatsApp ativo. Está deslogando quando fecha o GIT CMD. Avaliar como corrigir
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const port = 8000; //process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { execSync } = require('child_process');
const AUTH_PATH = path.join(__dirname, '.wwebjs_auth');
const CACHE_PATH = path.join(__dirname, '.wwebjs_cache');
const FLAG_RESTART = path.join(__dirname, 'need_reauth.flag');
// utilizado no VBA para verificar se o servidor esta no ar
const statusFile = 'C:\\Temp\\ECOCOLETA_STATUS.txt';
const fileLog = 'C:\\Temp\\LOG.txt';
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = chromePaths.find(p => fs.existsSync(p));

limpaSessaoWhats = 0;
isExibiuMsgAutenticado = 0;

// Configura multer para uploads temporários
const upload = multer({ dest: 'uploads/' });


// Aplica parsing JSON apenas para a rota send-message
app.use('/send-message', express.json());
app.use('/send-message', express.urlencoded({ extended: true }));

// NÃO aplique fileUpload globalmente (remove ou mova depois das rotas que usam multer)
// Se você realmente precisa de express-fileupload em outras rotas, adicione-o **depois**
// const fileUpload = require('express-fileupload');
// app.use(fileUpload({ debug: true }));

app.use("/", express.static(__dirname + "/"));

app.get('/', (req, res) => res.sendFile('index.html', { root: __dirname }));



function limparSessaoWhatsApp() {
  try {
	  //console.log('entrei em limparSessaoWhatsApp');
    if (fs.existsSync(AUTH_PATH)) {
		//console.log('AUTH_PATH existe');
      console.log('ECOCOLETA - Última sessão não foi finalizada corretamente. Removendo sessão antiga do WhatsApp...');
      execSync(`rmdir /s /q "${AUTH_PATH}"`, { stdio: 'ignore' });
	  //execSync(`rmdir /s /q "${AUTH_PATH}"`);
      console.log('ECOCOLETA - Sessão removida com sucesso');
	  console.log(`-> Favor abrir o navegador na URL abaixo e autenticar o WhatsApp.`);
	  console.log('-> Caso exista sessão salva e autenticada no WhatsApp do celular, você pode excluí-la caso deseje.');
	  console.log('-> Aguarde a mensagem "ECOCOLETA - Dispositivo pronto!" para iniciar o envio de mensagem.');
	  console.log('\n');
	  limpaSessaoWhats = 1;
    }
  } catch (err) {
    console.error('Erro ao remover sessão do WhatsApp:', err.message);
  }
}

if (fs.existsSync(FLAG_RESTART)) {
  limparSessaoWhatsApp();
  fs.unlinkSync(FLAG_RESTART);
}

// Se o status NÃO existe, mas há sessão → algo fechou errado
//if (!fs.existsSync(statusFile) && fs.existsSync(AUTH_PATH)) {
//  console.warn('ECOCOLETA - Sessão possivelmente inconsistente. Limpando...');
//  try {
//    require('child_process').execSync(`rmdir /s /q "${AUTH_PATH}"`);
//  } catch {}
//}

// Inicialização WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot-ecocoleta' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas','--no-first-run','--no-zygote',
      '--single-process','--disable-gpu'
    ]
  }
});
client.initialize();


// utilizado no VBA para verificar se o servidor esta no ar
//const statusFile = 'C:\\Temp\\ECOCOLETA_STATUS.txt';

// garante que a pasta C:\Temp existe
if (!fs.existsSync('C:\\Temp')) {
  fs.mkdirSync('C:\\Temp');
}

// exclui o arquivo antigo, se existir
if (fs.existsSync(statusFile)) {
  try {
    fs.unlinkSync(statusFile);
    console.log('Arquivo antigo de status removido.');
  } catch (err) {
    console.error('Erro ao excluir arquivo antigo de status:', err);
  }
}

io.on('connection', socket => {
  socket.emit('message', 'ECOCOLETA - Iniciado!');
  if (limpaSessaoWhats == 0){
	console.log('-> Caso já exista sessão aberta anteriormente, aguarde exibir "ECOCOLETA - Dispositivo pronto!" para enviar mensagem.');
	console.log('-> Caso demore muito, encerre a sessão via whatsapp do celular, caso existente, utilize CTRL+C e S nesta tela e tente novamente.');
	console.log('\n');
  }
  socket.emit('qr', './icon.svg');
  client.on('qr', qr => {
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
	  console.log('ECOCOLETA - Abra o navegador na URL acima e aponte a câmera do celular no QRCode!');
      socket.emit('message', 'ECOCOLETA - QRCode recebido, aponte a câmera do celular!');
    });
  });
  client.on('ready', () => {
    socket.emit('ready', 'ECOCOLETA - Dispositivo pronto!');
    socket.emit('message', 'ECOCOLETA - Dispositivo pronto!');
    socket.emit('qr', './check.svg')	
    console.log('ECOCOLETA - Dispositivo pronto!');

    // escreve o status no arquivo TEMP
    try {
      fs.writeFileSync(statusFile, 'ECOCOLETA - Dispositivo pronto!');
	  fs.writeFileSync(FLAG_RESTART, 'auth'); // Armazena que esta autenticado. Ao encerrar a sessão o arquivo não pode existir
    } catch (err) {
      console.error('Erro ao gravar arquivo de status:', err);
    }

  });
  client.on('authenticated', () => {
    socket.emit('authenticated', 'ECOCOLETA - Autenticado!');
    socket.emit('message', 'ECOCOLETA - Autenticado!');
	if (isExibiuMsgAutenticado == 0){
		console.log('ECOCOLETA - Autenticado!');
		console.log('-> Caso demore exibir "ECOCOLETA - Dispositivo pronto!", utilize CTRL+C e S nesta tela e tente novamente.');
		console.log('-> Caso continue demorando exibir "ECOCOLETA - Dispositivo pronto!", encerre a sessão via whatsapp do celular, utilize CTRL+C e S nesta tela e tente novamente.');
		console.log('\n');
		isExibiuMsgAutenticado = 1;
	}
  });
  client.on('auth_failure', () => {
    socket.emit('message', 'ECOCOLETA - Falha na autenticação, reiniciando...');
	console.log('ECOCOLETA - Falha na autenticação, reiniciando...');
    //client.initialize();
	process.exit(1); // força restart limpo
  });
  client.on('change_state', state => {
	console.log('ECOCOLETA - Status de conexão: ', state );
  });
  client.on('disconnected', reason => {
    socket.emit('message', 'ECOCOLETA - Cliente desconectado!');
	console.warn('ECOCOLETA - Cliente desconectado', reason);
	execSync(`rmdir /s /q "${AUTH_PATH}"`, { stdio: 'ignore' });

	// apaga o status, pois o bot caiu
	try {
		if (fs.existsSync(statusFile)) fs.unlinkSync(statusFile);
	} catch (err) {
		console.error('Erro ao excluir arquivo de status:', err);
	}

	try {
		fs.writeFileSync(FLAG_RESTART, 'reauth');
	} catch {}

    //client.initialize();
	process.exit(1); // força restart limpo
  });
});

// === Enpoints ===

// send-message (texto) — JSON
app.post('/send-message', [
  body('number').notEmpty(), body('message').notEmpty()
], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => msg);
  if (!errors.isEmpty()) return res.status(422).json({ status: false, message: errors.mapped() });
  const { number, message } = req.body;
  // (seu cálculo de numberZDG)
  let numberZDG = (number.substr(0,2) !== '55') ? number + '@c.us' : (() => {
    const DDD = number.substr(2,2); const user = number.substr(-8,8);
    return (parseInt(DDD) <= 30) ? `55${DDD}9${user}@c.us` : `55${DDD}${user}@c.us`;
  })();
  client.sendMessage(numberZDG, message)
    .then(response => res.json({ status: true, message: 'Mensagem enviada', response }))
    .catch(err => res.status(500).json({ status: false, message: 'Mensagem não enviada', response: err.text }));
});

// send-media (arquivo) — multer irá tratar multipart/form-data
app.post('/send-media', upload.single('file'), [
  body('number').notEmpty(), body('caption').notEmpty()
], async (req, res) => {
  try {
    // DEBUG: imprima headers/body/file para inspeção imediata
    //console.log('--- /send-media headers ---');
    //console.log(req.headers);
    //console.log('--- req.body ---');
    //console.log(req.body);      // number e caption devem aparecer aqui
    //console.log('--- req.file ---');
    //console.log(req.file);      // multer deve preencher isto

    const errors = validationResult(req).formatWith(({ msg }) => msg);
    if (!errors.isEmpty()) return res.status(422).json({ status: false, message: errors.mapped() });

    const { number, caption } = req.body;
    const file = req.file;
    if (!file) {
      console.error('No file found in req.file');
      return res.status(400).json({ status: false, message: 'Nenhum arquivo enviado.' });
    }

    const filePath = file.path;
    const mimetype = file.mimetype || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const media = new MessageMedia(mimetype, base64Data, file.originalname);

    // (seu cálculo numberZDG)
    let numberZDG = (number.substr(0,2) !== '55') ? number + '@c.us' : (() => {
      const DDD = number.substr(2,2); const user = number.substr(-8,8);
      return (parseInt(DDD) <= 30) ? `55${DDD}9${user}@c.us` : `55${DDD}${user}@c.us`;
    })();

    await client.sendMessage(numberZDG, media, { caption });
    fs.unlinkSync(filePath);
    res.json({ status: true, message: 'Arquivo enviado' });
  } catch (err) {
    console.error('Erro em /send-media:', err);
    // se o multer criou um arquivo temporário, tente remover (defensivo)
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    res.status(500).json({ status: false, message: 'Erro ao enviar arquivo', error: err.message });
  }
});

// Se você precisar realmente do express-fileupload: aplique **após** essas rotas.
// const fileUpload = require('express-fileupload');
// app.use(fileUpload({ debug: true }));

server.listen(port, () => {
  console.log(`Aplicação rodando na porta ${port}. URL: http://localhost:${port}`);
  if (!fs.existsSync(CACHE_PATH)) {
	  console.log('Abra o navegador na URL acima para autenticar o WhatsApp');
  }
});


function shutdown(signal) {
  console.log(`ECOCOLETA - Encerrando aplicação (${signal})`);
	fs.writeFileSync(fileLog, `ECOCOLETA - Encerrando aplicação (${signal})`);
  try {
    if (fs.existsSync(statusFile)) fs.unlinkSync(statusFile);
	if (signal == 'SIGINT') 
		if (fs.existsSync(FLAG_RESTART)) fs.unlinkSync(FLAG_RESTART);
  } catch {}

  process.exit(0);
}

// CTRL+C
process.on('SIGINT', shutdown);

// Fechar terminal / encerrar processo
process.on('SIGTERM', shutdown);

// Windows force close
process.on('SIGHUP', shutdown);

// Erro não tratado
process.on('uncaughtException', err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});