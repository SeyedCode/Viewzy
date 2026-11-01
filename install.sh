#!/bin/bash
set -e

# Colors
R='\033[0;31m'
G='\033[0;32m'
B='\033[0;34m'
C='\033[0;36m'
Y='\033[1;33m'
N='\033[0m'
BOLD='\033[1m'

clear
echo -e "${C}"
echo "  ██╗   ██╗██╗███████╗██╗    ██╗███████╗██╗   ██╗"
echo "  ██║   ██║██║██╔════╝██║    ██║╚══███╔╝╚██╗ ██╔╝"
echo "  ██║   ██║██║█████╗  ██║ █╗ ██║  ███╔╝  ╚████╔╝ "
echo "  ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║ ███╔╝    ╚██╔╝  "
echo "   ╚████╔╝ ██║███████╗╚███╔███╔╝███████╗   ██║   "
echo "    ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ ╚══════╝   ╚═╝   "
echo -e "${N}"
echo -e "  ${BOLD}Live Stream Load Testing Panel${N}"
echo -e "  ─────────────────────────────────────"
echo ""

# ── Node check ──
if ! command -v node &> /dev/null; then
  echo -e "${R}✖ Node.js پیدا نشد${N}"
  echo "  نصب کنید: https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${R}✖ Node.js نسخه ۱۸ یا بالاتر لازم است (فعلی: $(node -v))${N}"
  exit 1
fi
echo -e "${G}✔${N} Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
  echo -e "${R}✖ npm پیدا نشد${N}"
  exit 1
fi
echo -e "${G}✔${N} npm $(npm -v)"
echo ""

# ── Ask for Domain or IP ──
echo -e "${BOLD}تنظیم آدرس دسترسی به پنل${N}"
echo -e "  ─────────────────────────────────────"
echo ""
echo -e "  آیا برای پنل دامنه دارید؟"
echo -e "  ${C}1)${N} بله، دامنه دارم"
echo -e "  ${C}2)${N} خیر، از IP سرور استفاده شود"
echo ""
read -p "  انتخاب شما (1 یا 2): " CHOICE

PORT=3000
PUBLIC_HOST=""

if [ "$CHOICE" = "1" ]; then
  echo ""
  read -p "  دامنه را وارد کنید (مثال: panel.example.com): " DOMAIN
  # remove protocol and trailing slash if user typed them
  DOMAIN=$(echo "$DOMAIN" | sed -e 's|^https\?://||' -e 's|/$||')
  if [ -z "$DOMAIN" ]; then
    echo -e "${R}✖ دامنه خالی است${N}"
    exit 1
  fi
  PUBLIC_HOST="$DOMAIN"
  echo -e "${G}✔${N} دامنه تنظیم شد: ${BOLD}$DOMAIN${N}"
else
  # detect public IP
  echo ""
  echo -e "${B}→${N} در حال تشخیص IP سرور..."
  PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 icanhazip.com 2>/dev/null || curl -s --max-time 5 api.ipify.org 2>/dev/null || echo "")
  if [ -z "$PUBLIC_IP" ]; then
    # fallback to local IP
    PUBLIC_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi
  if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP="127.0.0.1"
  fi
  PUBLIC_HOST="$PUBLIC_IP"
  echo -e "${G}✔${N} IP تشخیص داده شد: ${BOLD}$PUBLIC_IP${N}"
fi

echo ""
read -p "  پورت پنل (پیش‌فرض 3000): " INPUT_PORT
if [ -n "$INPUT_PORT" ]; then
  PORT="$INPUT_PORT"
fi
echo -e "${G}✔${N} پورت: ${BOLD}$PORT${N}"
echo ""

# ── Install packages ──
echo -e "${B}→${N} نصب پکیج‌ها..."
npm install --no-audit --no-fund --silent
echo -e "${G}✔${N} پکیج‌ها نصب شدند"
echo ""

echo -e "${B}→${N} نصب Chromium (Playwright)..."
echo -e "  ${Y}این مرحله ممکن است چند دقیقه طول بکشد${N}"
npx playwright install --with-deps chromium 2>/dev/null || npx playwright install chromium
echo -e "${G}✔${N} مرورگر آماده است"
echo ""

# ── Create data + config ──
mkdir -p data

cat > data/config.json << CONFIGEOF
{
  "port": ${PORT},
  "host": "0.0.0.0",
  "publicHost": "${PUBLIC_HOST}",
  "publicUrl": "http://${PUBLIC_HOST}:${PORT}"
}
CONFIGEOF

echo -e "${G}✔${N} تنظیمات ذخیره شد"
echo ""

# ── Done ──
echo -e "${C}══════════════════════════════════════${N}"
echo -e "  ${G}${BOLD}نصب با موفقیت انجام شد!${N}"
echo -e "${C}══════════════════════════════════════${N}"
echo ""
echo -e "  برای اجرا:"
echo -e "  ${BOLD}npm start${N}"
echo ""
echo -e "  آدرس پنل:"
echo -e "  ${BOLD}http://${PUBLIC_HOST}:${PORT}${N}"
echo ""
if [ "$CHOICE" = "1" ]; then
  echo -e "  ${Y}نکته:${N} اگر از دامنه استفاده می‌کنید،"
  echo -e "  بهتر است با Nginx یا Caddy روی پورت ۸۰/۴۴۳ پروکسی کنید."
  echo ""
fi
