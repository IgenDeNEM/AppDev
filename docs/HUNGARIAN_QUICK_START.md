# Tweak Alkalmazás - Gyors Indítási Útmutató

Indítsd el a Tweak Alkalmazást percek alatt!

## 🚀 Gyors Telepítés (5 Perc)

### Előfeltételek Ellenőrzése
```bash
# Ellenőrizd, hogy van-e Node.js (v18+)
node --version

# Ellenőrizd, hogy van-e MariaDB
mysql --version

# Ha nincs telepítve, lásd a teljes telepítési útmutatót
```

### 1. Klónozás és Beállítás
```bash
git clone https://github.com/your-username/tweak-application.git
cd tweak-application
```

### 2. Függőségek Telepítése
```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Desktop App
cd desktop-app && npm install && cd ..
```

### 3. Adatbázis Beállítása
```bash
# Adatbázis létrehozása (cseréld le a 'password'-t a MariaDB root jelszavadra)
mysql -u root -p -e "CREATE DATABASE tweak_app; CREATE USER 'tweak_user'@'localhost' IDENTIFIED BY 'password'; GRANT ALL PRIVILEGES ON tweak_app.* TO 'tweak_user'@'localhost'; FLUSH PRIVILEGES;"

# Séma importálása
mysql -u tweak_user -p tweak_app < backend/database/schema.sql
```

### 4. Környezeti Konfiguráció
```bash
# Környezeti fájl másolása és szerkesztése
cd backend
cp .env.example .env

# .env fájl szerkesztése a beállításaiddal
nano .env  # vagy használd a kedvenc szerkesztődet
```

**Minimum szükséges .env beállítások:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tweak_app
DB_USER=tweak_user
DB_PASSWORD=password

JWT_SECRET=your_jwt_secret_key_here
PORT=5000
FRONTEND_URL=http://localhost:3000

# SMTP (opcionális email verifikációhoz)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 5. Alkalmazás Indítása
```bash
# Terminal 1: Backend indítása
cd backend
npm run dev

# Terminal 2: Frontend indítása (Admin Panel)
cd frontend
npm start

# Terminal 3: Desktop App indítása
cd desktop-app
npm run dev
```

## 🎯 Első Lépések

### 1. Admin Panel Elérése
- Nyisd meg a böngészőt a `http://localhost:3000` címen
- Hozz létre az első admin fiókodat
- Konfiguráld az SMTP beállításokat (opcionális)

### 2. Desktop App Futtatása
- A desktop app automatikusan meg kell, hogy nyíljon
- Jelentkezz be az admin hitelesítő adataiddal
- Fedezd fel a Főoldal tab-ot az előre konfigurált tweak-ekkel

### 3. Alapvető Funkcionalitás Tesztelése
- Próbálj ki egy egyszerű tweak-et, mint a "Lomtár Tisztítása"
- Telepíts egy csomagot a Csomag Tárból
- Ellenőrizd az admin panelben a aktivitás naplókat

## 🔧 Gyakori Gyors Javítások

### Port Már Használatban
```bash
# Folyamat leállítása a 5000-es porton
npx kill-port 5000

# Folyamat leállítása a 3000-as porton
npx kill-port 3000
```

### Adatbázis Kapcsolódási Problémák
```bash
# Ellenőrizd, hogy a MariaDB fut-e
sudo systemctl status mariadb  # Linux
net start mariadb              # Windows

# Kapcsolat tesztelése
mysql -u tweak_user -p tweak_app -e "SELECT 1;"
```

### Jogosultsági Problémák (Linux)
```bash
# npm jogosultságok javítása
sudo chown -R $(whoami) ~/.npm
```

## 📱 Gyors Funkció Bevezetés

### Főoldal Tab
- **Gyors Műveletek**: Teljesítmény Növelés, Rendszer Tisztítás, DNS Flush
- **Tweak Kategóriák**: Adatvédelem, Játékok, Fájlok, Frissítések, Teljesítmény, Rendszer
- **Téma Váltás**: Váltás világos és sötét mód között

### Alkalmazások Eltávolítása Tab
- **Biztonságos Mód**: Megakadályozza a rendszeralkalmazások eltávolítását
- **Többes Kiválasztás**: Több alkalmazás kiválasztása tömeges eltávolításhoz
- **Keresés**: Specifikus alkalmazások gyors megtalálása

### Csomag Tár Tab
- **Kategóriák**: Böngészők, Játékok, Kommunikáció, Fejlesztői Eszközök, Segédeszközök
- **Telepítés**: Egy kattintásos telepítés Chocolatey/Winget segítségével
- **Verifikáció**: Email verifikáció védett csomagokhoz

### Admin Panel
- **Felhasználó Kezelés**: Felhasználók létrehozása és szerepkörök hozzárendelése
- **Csomag Kezelés**: Csomagok és kategóriák hozzáadása/szerkesztése
- **Aktivitás Naplók**: Minden rendszer aktivitás monitorozása
- **SMTP Beállítások**: Email verifikáció konfigurálása

## 🆘 Segítségre Van Szükséged?

### Gyors Hibaelhárítás
1. **Naplók ellenőrzése**: Nézd meg a `backend/logs/` mappát hibaüzenetekért
2. **Adatbázis verifikálása**: Győződj meg róla, hogy a MariaDB fut és elérhető
3. **Portok ellenőrzése**: Győződj meg róla, hogy a 3000-as és 5000-es portok elérhetők
4. **Környezet**: Verifikáld, hogy a `.env` fájlod helyes beállításokkal rendelkezik

### Támogatás Kérése
- **Dokumentáció**: Ellenőrizd a `/docs` mappát részletes útmutatókért
- **GitHub Issues**: Hibák jelentése és funkciók kérése
- **Egészség Ellenőrzés**: Látogass el a `http://localhost:5000/api/health` címre

## 🎉 Készen Állsz!

A Tweak Alkalmazásod most fut:
- ✅ Backend szerver a 5000-es porton
- ✅ Admin panel a 3000-as porton
- ✅ Desktop alkalmazás használatra kész
- ✅ Adatbázis konfigurálva és kész
- ✅ Alapvető biztonsági funkciók engedélyezve

**Következő Lépések:**
1. Konfiguráld az SMTP-t email verifikációhoz
2. Állítsd be a felhasználói szerepköröket és jogosultságokat
3. Adj hozzá egyedi csomagokat a tárhoz
4. Testreszabd a tweak-eket az igényeid szerint

Részletes konfigurációért és fejlett funkciókért lásd a teljes dokumentációt a `/docs` mappában.

---

**Jó Tweaking-et! 🚀**