# Viewzy

پنل تحت وب مدرن برای تست فشار لایو استریم با پروکسی.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Playwright](https://img.shields.io/badge/Playwright-Chromium-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## نصب


```bash
git clone https://github.com/YOUR_USERNAME/viewzy.git
cd viewzy
bash install.sh
npm start
```

در حین نصب از شما پرسیده می‌شود:
- دامنه دارید یا از IP استفاده شود؟
- پورت پنل (پیش‌فرض ۳۰۰۰)

## ویژگی‌ها

- ظاهر مدرن تیره (RTL فارسی)
- مدیریت چند لایو همزمان
- تعیین تعداد سشن توسط کاربر
- پیدا کردن خودکار پروکسی
- مانیتورینگ لحظه‌ای
- پشتیبانی از دامنه یا IP

## استفاده

1. لایو جدید اضافه کن
2. روی «شروع تست» بزن
3. تعداد سشن و مدت را مشخص کن
4. مانیتورینگ را ببین

## اجرا در پس‌زمینه

```bash
npm install -g pm2
pm2 start src/server.js --name viewzy
pm2 save
```

## مجوز

MIT
