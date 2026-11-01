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

# Node check
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

echo -e "${B}→${N} نصب پکیج‌ها..."
npm install --no-audit --no-fund --silent
echo -e "${G}✔${N} پکیج‌ها نصب شدند"
echo ""

echo -e "${B}→${N} نصب Chromium (Playwright)..."
echo -e "  ${Y}این مرحله ممکن است چند دقیقه طول بکشد${N}"
npx playwright install --with-deps chromium 2>/dev/null || npx playwright install chromium
echo -e "${G}✔${N} مرورگر آماده است"
echo ""

mkdir -p data
echo -e "${G}✔${N} پوشه data ساخته شد"
echo ""

echo -e "${C}══════════════════════════════════════${N}"
echo -e "  ${G}${BOLD}نصب با موفقیت انجام شد!${N}"
echo -e "${C}══════════════════════════════════════${N}"
echo ""
echo -e "  برای اجرا:"
echo -e "  ${BOLD}npm start${N}"
echo ""
echo -e "  سپس باز کنید:"
echo -e "  ${BOLD}http://localhost:3000${N}"
echo ""
