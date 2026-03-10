export function driveToPreview(url) {
  if (!url) return "";

  url = url.trim();

  const idMatch = url.match(/[-\w]{25,}/);
  if (!idMatch) return url;

  const fileId = idMatch[0];
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function placeholderHtml(title, msg) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body{
            font-family: system-ui;
            background:#111;
            color:#eee;
            display:flex;
            align-items:center;
            justify-content:center;
            height:100vh;
            margin:0;
          }
          .box{
            text-align:center;
            opacity:.85;
          }
          h1{margin-bottom:8px;}
        </style>
      </head>
      <body>
        <div class="box">
          <h1>${title}</h1>
          <p>${msg}</p>
        </div>
      </body>
    </html>
  `;
}