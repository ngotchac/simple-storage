const Koa = require('koa');
const Body = require('koa-body');
const Cors = require('@koa/cors');
const Logger = require('koa-logger');
const Router = require('koa-router');
const Static = require('koa-static');

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const uuid = require('uuid/v4');

const app = new Koa();
const router = new Router();

const TMP_DIR = path.join(os.tmpdir(), '.storage');

fs.ensureDir(TMP_DIR);

app.use(Logger());
app.use(Cors());
app.use(Body({ multipart: true }));
app.use(Static(path.join(__dirname, '/public')));

app.use(async (ctx, next) => {
  if (!ctx.path) {
    return next();
  }

  const fpath = path.join(TMP_DIR, ctx.path);

  if (await fs.pathExists(fpath)) {
    ctx.type = path.extname(fpath);
    ctx.body = fs.createReadStream(fpath);
  } else {
    await next();
  }
});

router.post('/', async (ctx) => {
  const { file } = ctx.request.body.files;
  const reader = fs.createReadStream(file.path);
  const filepath = `${uuid()}/${file.name}`;
  const fullpath = path.join(TMP_DIR, filepath);

  await fs.ensureFile(fullpath);

  const stream = fs.createWriteStream(fullpath);

  reader.pipe(stream);
  console.log('uploading %s -> %s', file.name, stream.path);

  ctx.body = {
    link: filepath
  };
});

app
  .use(router.routes())
  .use(router.allowedMethods());

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
