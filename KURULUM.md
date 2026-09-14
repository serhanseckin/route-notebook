# Rota Defteri — telefona kurulum (PWA)

Uygulama tek bir statik klasör: `index.html`, `manifest.webmanifest`, `sw.js` ve ikonlar.
Telefona "uygulama" olarak eklenebilmesi ve konum izninin çalışması için **https** ile
sunulması gerekir. En kolay ücretsiz yol GitHub Pages.

## 1) GitHub Pages ile yayınlama (ücretsiz, ~5 dakika)

1. github.com'da oturum aç, **New repository** → ad: `rota-defteri`, Public, "Add a README" işaretleme, **Create**.
2. Bu klasörde terminal aç ve şunları çalıştır (KULLANICI_ADI'nı kendi adınla değiştir):

   ```bash
   git remote add origin https://github.com/KULLANICI_ADI/rota-defteri.git
   git branch -M main
   git push -u origin main
   ```

3. GitHub'da repo → **Settings → Pages** → "Build and deployment" altında Source: **Deploy from a branch**,
   Branch: **main** / **(root)** → **Save**.
4. 1–2 dakika sonra adres hazır: `https://KULLANICI_ADI.github.io/rota-defteri/`

Her değişiklikte `git add -A && git commit -m "güncelleme" && git push` yeterli; telefon bir sonraki açılışta yeni sürümü alır.

## 2) Telefona ekleme

- **Android / Chrome:** adresi aç → sağ üst ⋮ → **Ana ekrana ekle** (veya "Uygulamayı yükle").
- **iPhone / Safari:** adresi aç → Paylaş simgesi → **Ana Ekrana Ekle**.

Ana ekrandan açınca tam ekran, tarayıcı çubuğu olmadan çalışır.

## 3) Konum ve yürüme rotası

- **Konum** düğmesi ilk basışta izin ister; "Buradasın" işareti haritaya düşer ve alt şeritte
  sonraki durak, tahmini mesafe ve **Yol tarifi** (Google Maps yürüyüş) düğmesi görünür.
- Sokak rotaları FOSSGIS Valhalla servisinden gelir (ücretsiz, anahtarsız). Bir adım için
  alınamazsa listede "kuş uçuşu tahmin" yazar ve o adım havadan düz çizgiyle gösterilir.

## 4) Çevrimdışı

Uygulama kabuğu ve Three.js önbelleğe alınır; daha önce yüklenen harita parçaları ve rotalar
cihazda kalır. Yeni adres arama, yeni harita parçası ve yeni sokak rotası için internet gerekir.

## Alternatif barındırma

Netlify Drop (app.netlify.com/drop) ya da Cloudflare Pages'e klasörü sürükleyip bırakmak da çalışır;
ikisi de ücretsiz hesap ister.
