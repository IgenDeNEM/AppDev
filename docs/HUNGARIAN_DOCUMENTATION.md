# Tweak Alkalmazás - Magyar Dokumentáció

Ez a dokumentum a Tweak Alkalmazás teljes funkcionalitását ismerteti magyar nyelven.

## 📋 Áttekintés

A Tweak Alkalmazás egy átfogó rendszeroptimalizáló és felügyeleti platform, amely lehetővé teszi a Windows rendszerek hatékony kezelését, alkalmazások telepítését és eltávolítását, valamint rendszerbeállítások módosítását.

## 🏗️ Architektúra

### Főbb Komponensek
- **Backend**: Node.js szerver MariaDB adatbázissal
- **Frontend**: React admin felület
- **Desktop Alkalmazás**: Electron alapú asztali alkalmazás
- **Adatbázis**: MariaDB relációs adatbázis

### Technológiai Stack
- **Backend**: Node.js, Express.js, MariaDB, Socket.IO
- **Frontend**: React, Material-UI, Axios
- **Desktop**: Electron, Node.js
- **Biztonság**: JWT, bcrypt, SMTP email verifikáció

## 🏠 Főbb Funkciók

### 1. Főoldal (Home Tab)
A rendszer tweak-ek kategóriák szerint csoportosítva.

#### Kategóriák
- **Adatvédelem**: Telemetria, hirdetések és adatvédelmi tweak-ek
- **Játékok**: Játékokhoz optimalizált teljesítmény beállítások
- **Fájlok**: Fájlrendszer és tárhely optimalizálás
- **Frissítések**: Windows Update és rendszerfrissítések kezelése
- **Teljesítmény**: Rendszer teljesítmény optimalizálás
- **Rendszer**: Rendszer konfiguráció és szolgáltatások

#### Előre konfigurált Tweak-ek
- **Edge Eltávolítása**: Microsoft Edge böngésző teljes eltávolítása
- **Edge Átirányítások Visszavonása**: Alapértelmezett böngésző asszociációk visszaállítása
- **Telemetria Letiltása**: Windows telemetria és adatgyűjtés letiltása
- **Hirdetések Letiltása**: Windows hirdetések és promóciós tartalom letiltása
- **Ultimate Teljesítmény Terv Engedélyezése**: Windows Ultimate Performance energia terv engedélyezése
- **Ragadós Billentyűk Gyorsbillentyű Letiltása**: Ragadós Billentyűk akadálymentességi gyorsbillentyű letiltása
- **Vencord Telepítése**: Vencord Discord kliens mod telepítése
- **Lomtár Tisztítása**: Windows Lomtár kiürítése
- **Ideiglenes Fájlok Törlése**: Ideiglenes fájlok és cache tisztítása
- **Rendszer Tisztítás**: Fejlett rendszer tisztítás naplók és prefetch fájlokkal
- **DNS Flush**: DNS cache kiürítése kapcsolódási problémák megoldásához
- **Teljesítmény Növelés**: Nem lényeges háttérfolyamatok leállítása

#### Gyors Műveletek
- **Teljesítmény Növelés**: Háttérfolyamatok leállítása
- **Vágólap Kezelő**: Utolsó 10 másolat megtekintése
- **DNS Flush**: DNS cache kiürítése
- **Sötét/Világos Mód Váltás**: Témák közötti váltás
- **Mindig Felül Toggle**: Ablak más ablakok felett tartása
- **Rendszer Tisztítás**: Extra cache eltávolítás (temp, naplók, prefetch)
- **Windows Szolgáltatások Kezelő**: Nem lényeges szolgáltatások ki/bekapcsolása

### 2. Alkalmazások Eltávolítása Tab
Átfogó alkalmazáskezelés biztonsági funkciókkal.

#### Funkciók
- **Alkalmazás Lista**: Telepített alkalmazások megjelenítése név, verzió, kiadó szerint
- **Keresés és Szűrés**: Szűrés rendszeralkalmazások, Microsoft alkalmazások, harmadik féltől származó alkalmazások szerint
- **Többes Kiválasztás**: Több alkalmazás kiválasztása tömeges eltávolításhoz
- **Biztonságos Mód**: Csak nem kritikus alkalmazások távolíthatók el (rendszeralkalmazások szürkítve)
- **Átfogó Naplózás**: Minden eltávolítási kísérlet naplózva siker/hiba és időbélyeggel

#### Biztonsági Funkciók
- Rendszeralkalmazások egyértelműen jelölve és védve a Biztonságos Módban
- Email verifikáció szükséges rendszeralkalmazások eltávolításához
- Részletes megerősítő dialógusok veszélyes műveletekhez

### 3. Csomag Tár Tab
Alkalmazás telepítési és kezelési rendszer.

#### Kategóriák
- **Böngészők**: Chrome, Firefox, Brave, Edge
- **Játékok**: Steam, Epic Games, Battle.net, Riot Client
- **Kommunikáció**: Discord, Teams, Slack, Zoom
- **Fejlesztői Eszközök**: VS Code, Git, Node.js, Python
- **Segédeszközök**: 7-Zip, WinRAR, Notepad++, VLC

#### Telepítési Módok
- **Chocolatey**: Csomagkezelő integráció
- **Winget**: Windows Package Manager
- **Közvetlen Letöltés**: Hivatalos telepítő letöltések
- **Csendes Telepítés**: Automatizált telepítés megfelelő flag-ekkel

#### Funkciók
- **Keresés és Szűrés**: Könnyű navigáció az elérhető csomagok között
- **Telepítési Naplózás**: Minden telepítés naplózva siker/hiba és időbélyeggel
- **Verifikációs Rendszer**: Email verifikáció védett alkalmazásokhoz
- **Admin Kezelés**: Csomag lista szerkeszthető az admin panelből

## 🔐 Szerepkör Alapú Hozzáférés Szabályozás (RBAC)

### Felhasználói Szerepkörök
- **Szuperadmin**: Teljes rendszer hozzáférés minden jogosultsággal
- **Admin**: Adminisztratív hozzáférés a legtöbb jogosultsággal
- **Felhasználó**: Standard felhasználó korlátozott jogosultságokkal

### Jogosultság Típusok
- **Tweak-ek**: Hozzáférés specifikus tweak-ekhez vagy minden tweak-hez
- **Csomag Kategóriák**: Hozzáférés specifikus csomag kategóriákhoz
- **Csomagok**: Hozzáférés specifikus csomagokhoz
- **Rendszer Műveletek**: Hozzáférés rendszer szintű műveletekhez

### Jogosultság Kezelés
- **Részletes Vezérlés**: Finomhangolt jogosultságok minden erőforráshoz
- **Szerepkör Hozzárendelés**: Felhasználók több szerepkört is kaphatnak
- **Jogosultság Öröklés**: Szerepkörök örökölhetnek jogosultságokat más szerepköröktől
- **Dinamikus Frissítések**: Jogosultságok valós időben frissíthetők

## 📊 Admin Panel Fejlesztések

### 1. Felhasználó Kezelés
- **Felhasználó Létrehozás/Törlés**: Felhasználók hozzáadása és eltávolítása
- **Szerepkör Hozzárendelés**: Szerepkörök hozzárendelése felhasználókhoz
- **Jogosultság Kezelés**: Vezérlés, hogy mely tweak-ekhez és csomagokhoz férnek hozzá a felhasználók
- **Tömeges Műveletek**: Több felhasználó egyidejű kezelése

### 2. Csomag Tár Kezelés
- **Csomag CRUD**: Csomagok létrehozása, olvasása, frissítése, törlése
- **Kategória Kezelés**: Csomagok kategóriákba szervezése
- **Telepítés Nyomon Követése**: Csomag telepítések monitorozása
- **Verifikációs Beállítások**: Konfigurálás, hogy mely csomagok igényelnek verifikációt

### 3. Szerepkör Kezelés
- **Szerepkör Létrehozás**: Egyedi szerepkörök létrehozása specifikus jogosultságokkal
- **Jogosultság Hozzárendelés**: Részletes jogosultságok hozzárendelése szerepkörökhöz
- **Felhasználó Hozzárendelés**: Szerepkörök hozzárendelése felhasználókhoz
- **Rendszer Szerepkör Védelem**: Kritikus rendszer szerepkörök módosításának megakadályozása

### 4. Naplók és Monitorozás
- **Átfogó Naplózás**: Minden művelet naplózva felhasználó, időbélyeg és státusz szerint
- **Keresés és Szűrés**: Fejlett szűrés felhasználó, művelet típus, dátum szerint
- **Export Funkcionalitás**: Naplók exportálása CSV formátumba
- **Valós Idejű Monitorozás**: Rendszer aktivitás élő frissítései

## 🔒 Biztonsági Funkciók

### SMTP Integráció (2FA)
- **Email Verifikáció**: 8 számjegyű verifikációs kódok érzékeny műveletekhez
- **Művelet Típusok**:
  - Felhasználó regisztráció
  - Jelszó visszaállítás/módosítás
  - Admin fiók létrehozás/szerepkör változtatások
  - Biztonsági riasztások (sikertelen bejelentkezések)
  - Rendszer értesítések
  - Rendszeralkalmazások eltávolítása
  - Védett alkalmazások telepítése

### Biztonsági Intézkedések
- **Kód Lejárat**: Verifikációs kódok 5-10 perc után lejárnak
- **Sebesség Korlátozás**: Védelem brute force támadások ellen
- **Fiók Zárolás**: Ideiglenes fiók zárolás sikertelen kísérletek után
- **IP Naplózás**: Minden felhasználó IP címének nyomon követése és naplózása
- **Geolokáció**: Hozzávetőleges helyzet nyomon követése biztonsághoz

## 🎨 UI/UX Fejlesztések

### Téma Rendszer
- **Sötét/Világos Mód**: Teljes téma váltás
- **Rendszer Beállítás**: Automatikus téma felismerés
- **Tartós Beállítások**: Téma beállítások felhasználónként mentve

### Felhasználói Beállítások
- **Mindig Felül**: Alkalmazás ablak más ablakok felett tartása
- **Biztonságos Mód**: Veszélyes műveletek végrehajtásának megakadályozása
- **Értesítési Beállítások**: Asztali, email és hang értesítések konfigurálása
- **UI Testreszabás**: Kompakt mód, fejlett opciók láthatósága

### Valós Idejű Funkciók
- **Élő Frissítések**: Valós idejű státusz frissítések
- **Toast Értesítések**: Siker/hiba értesítések
- **Folyamat Mutatók**: Betöltési állapotok minden művelethez
- **Hibakezelés**: Átfogó hibaüzenetek és helyreállítás

## 🔧 Technikai Implementáció

### Backend Szolgáltatások
- **PackageService**: Csomag telepítés és nyomon követés kezelése
- **TweakService**: Tweak végrehajtás és naplózás kezelése
- **RBACService**: Szerepkör alapú hozzáférés szabályozás kezelése
- **UserPreferencesService**: Felhasználói beállítások és preferenciák

### Adatbázis Séma
- **Csomag Kezelés**: Táblák csomagokhoz, kategóriákhoz és telepítésekhez
- **Tweak Kezelés**: Táblák tweak-ekhez, kategóriákhoz és végrehajtásokhoz
- **RBAC Rendszer**: Táblák szerepkörökhöz, jogosultságokhoz és hozzárendelésekhez
- **Felhasználói Beállítások**: Táblák felhasználói beállításokhoz és preferenciákhoz
- **Átfogó Naplózás**: Táblák minden rendszer aktivitáshoz

### API Végpontok
- **Csomag Kezelés**: `/api/packages/*`
- **Tweak Kezelés**: `/api/tweaks/*`
- **RBAC Kezelés**: `/api/rbac/*`
- **Felhasználói Beállítások**: `/api/user-preferences/*`

## 🚀 Telepítési Útmutató

### Rendszer Követelmények
- **Operációs Rendszer**: Windows 10/11 vagy Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **RAM**: Minimum 4GB, Ajánlott 8GB+
- **Tárhely**: Minimum 2GB szabad hely
- **Hálózat**: Internet kapcsolat csomag letöltésekhez és email verifikációhoz

### Szoftver Követelmények
- **Node.js**: v18.0.0 vagy újabb
- **MariaDB**: v10.6 vagy újabb
- **Git**: Legújabb verzió
- **Chocolatey** (Windows) vagy **Csomagkezelő** (Linux)
- **SMTP Szerver**: Email verifikációhoz (Gmail, Outlook, vagy egyedi SMTP)

### Telepítési Lépések

#### 1. Node.js Telepítése
```bash
# Letöltés a nodejs.org-ról és telepítés
node --version  # Verifikáció
npm --version   # Verifikáció
```

#### 2. MariaDB Telepítése
```bash
# Windows: Letöltés mariadb.org-ról és telepítés
# Linux:
sudo apt install mariadb-server mariadb-client  # Ubuntu/Debian
sudo yum install mariadb-server mariadb         # CentOS/RHEL
```

#### 3. Repository Klónozása
```bash
git clone https://github.com/your-username/tweak-application.git
cd tweak-application
```

#### 4. Függőségek Telepítése
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Desktop App
cd ../desktop-app
npm install
```

#### 5. Adatbázis Beállítása
```sql
CREATE DATABASE tweak_app;
CREATE USER 'tweak_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tweak_app.* TO 'tweak_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 6. Környezeti Konfiguráció
```env
# .env fájl beállítása
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tweak_app
DB_USER=tweak_user
DB_PASSWORD=your_password

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

## 🎯 Használati Útmutató

### Alkalmazás Indítása

#### Fejlesztési Mód
```bash
# Backend szerver indítása
cd backend
npm run dev

# Frontend (Admin Panel) indítása
cd frontend
npm start

# Desktop alkalmazás indítása
cd desktop-app
npm run dev
```

#### Termelési Mód
```bash
# Frontend build
cd frontend
npm run build

# Backend termelési módban
cd backend
npm start

# Desktop alkalmazás
cd desktop-app
npm run start
```

### Első Beállítások

1. **Admin Fiók Létrehozása**: Regisztrálj egy admin fiókot
2. **SMTP Beállítások**: Konfiguráld az email verifikációt
3. **Szerepkörök Beállítása**: Állítsd be a felhasználói szerepköröket
4. **Csomagok Hozzáadása**: Adj hozzá alkalmazásokat a csomag tárhoz

## 🛠️ Hibaelhárítás

### Gyakori Problémák

#### Port Már Használatban
```bash
# Folyamat keresése porton
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Linux

# Folyamat leállítása
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # Linux
```

#### Adatbázis Kapcsolódási Problémák
1. Ellenőrizd a MariaDB szolgáltatás állapotát
2. Verifikáld az adatbázis hitelesítő adatokat a `.env` fájlban
3. Ellenőrizd a tűzfal beállításokat

#### Jogosultsági Problémák (Linux)
```bash
# npm jogosultságok javítása
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Napló Fájlok
- **Backend naplók**: `backend/logs/`
- **Desktop app naplók**: `desktop-app/logs/`
- **Rendszer naplók**: Ellenőrizd a rendszer eseménynaplót (Windows) vagy journalctl (Linux)

## 🔒 Biztonsági Megfontolások

### Termelési Telepítés
1. **HTTPS Használata**: SSL tanúsítványok konfigurálása
2. **Tűzfal**: Hozzáférés korlátozása csak szükséges portokra
3. **Adatbázis Biztonság**: Erős jelszavak használata és adatbázis hozzáférés korlátozása
4. **Környezeti Változók**: Soha ne commitold a `.env` fájlokat verziókezelésbe
5. **Rendszeres Frissítések**: Tartsd naprakészen az összes függőséget

### Backup Stratégia
```bash
# Adatbázis backup
mysqldump -u tweak_user -p tweak_app > backup_$(date +%Y%m%d).sql

# Alkalmazás backup
tar -czf tweak_app_backup_$(date +%Y%m%d).tar.gz /path/to/tweak-application
```

## 📞 Támogatás

### Segítség Kérése
1. **Dokumentáció**: Ellenőrizd a `/docs` mappát részletes útmutatókért
2. **Problémák**: Jelentsd a hibákat GitHub Issues-on
3. **Naplók**: Ellenőrizd az alkalmazás és rendszer naplókat hiba részletekért
4. **Közösség**: Csatlakozz a Discord szerverünkhöz közösségi támogatáshoz

### Egészség Ellenőrzések
```bash
# Backend egészség
curl http://localhost:5000/api/health

# Adatbázis kapcsolat
mysql -u tweak_user -p -e "SELECT 1;"
```

## 🎉 Készen Állsz!

A telepítés befejezése után:
1. Hozzáférhetsz az admin panelhez a `http://localhost:3000` címen
2. Futtathatod az asztali alkalmazást rendszeroptimalizáláshoz
3. Konfigurálhatod a felhasználói szerepköröket és jogosultságokat
4. Beállíthatod az email verifikációt a fokozott biztonsághoz

Részletes funkció dokumentációért lásd a többi útmutatót a `/docs` mappában.

---

## 📚 További Dokumentáció

- **Telepítési Útmutató**: Részletes telepítési lépések
- **API Dokumentáció**: API végpontok és használat
- **RBAC Implementáció**: Szerepkör alapú hozzáférés szabályozás
- **Fejlesztői Útmutató**: Fejlesztési környezet beállítása
- **Biztonsági Útmutató**: Biztonsági beállítások és ajánlások

Ez a Tweak Alkalmazás egy átfogó rendszeroptimalizáló és felügyeleti platform vállalati szintű funkciókkal, biztonsággal és felhasználói élmény fejlesztésekkel.