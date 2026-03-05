# Frase do Dia (EP) — site estático

Inclui:
- Frase do dia (pt-PT) + tradução EN (opcional, pode ficar escondida)
- Mini‑teste (cloze) para incentivar *recall* (memória)
- Histórico à esquerda (últimos 90 dias por defeito)
- Sem backend (por enquanto). Preferências e estatísticas básicas ficam em `localStorage`.

## Ficheiros
- `index.html`
- `styles.css`
- `app.js`
- `phrases.json` (300 frases)
- `phrases.csv` (mesmo conteúdo, em CSV)

## Como funciona a frase do dia
`app.js` calcula os dias desde `START_DATE` (no fuso `Europe/Lisbon`) e usa esse índice para escolher a frase.

Se quiseres começar a rotação na data do deploy:
1) abre `app.js`
2) muda `START_DATE = "YYYY-MM-DD"`

## Deploy no teu Ubuntu + Nginx (Lightsail)

### 1) Copiar ficheiros para o servidor
No teu Mac:
```bash
scp -r frase-do-dia-site/* ubuntu@SEU_IP:/var/www/frase-do-dia/
```

Ou então via git:
```bash
ssh ubuntu@SEU_IP
sudo mkdir -p /var/www/frase-do-dia
cd /var/www/frase-do-dia
sudo chown -R ubuntu:ubuntu /var/www/frase-do-dia
# depois: git clone ... ou git pull
```

### 2) Configurar Nginx
No servidor:
```bash
sudo nano /etc/nginx/sites-available/frase-do-dia
```

Conteúdo (ajusta o domínio; se não tiveres domínio, usa o IP):
```nginx
server {
  listen 80;
  server_name _;

  root /var/www/frase-do-dia;
  index index.html;

  location / {
    try_files $uri $uri/ =404;
  }

  # cache leve para css/js, sem cache para JSON (para poderes atualizar facilmente)
  location ~* \.(css|js)$ {
    add_header Cache-Control "public, max-age=3600";
  }
  location = /phrases.json {
    add_header Cache-Control "no-store";
  }
}
```

Ativar:
```bash
sudo ln -sf /etc/nginx/sites-available/frase-do-dia /etc/nginx/sites-enabled/frase-do-dia
sudo nginx -t
sudo systemctl reload nginx
```

### 3) Atualizar depois
Se estás a usar git no servidor:
```bash
cd /var/www/frase-do-dia
git pull
sudo systemctl reload nginx
```

Ou com `scp`:
```bash
scp -r frase-do-dia-site/* ubuntu@SEU_IP:/var/www/frase-do-dia/
sudo systemctl reload nginx
```

## Próximo passo (quando quiseres)
- “Histórico completo” com pesquisa por palavra
- Registo (Google) + guardar progresso no backend
- Spaced repetition real (agendar revisões com base nos acertos)
