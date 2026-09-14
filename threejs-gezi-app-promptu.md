# Proje: "Rota Defteri" — Three.js ile 3D Gezi Rotası Planlayıcı

## Bağlam ve amaç

Kişisel kullanımım için (tek kullanıcı, ben) bir gezi planlama uygulaması istiyorum. Barcelona, Milano ve Roma'ya yapacağım seyahatte gidecegim yerleri (çoğu ünlü olmayan restoran/kafe gibi mekanlar dahil) ekleyip, oteli sabit başlangıç noktası alarak en mantıklı yürüme sırasını görmek istiyorum. Ayrıca havalimanı ve maç günü stadyum gibi toplu taşımayla gideceğim özel durumlar için de bilgi göstermeli.

Bu, üretilecek gerçek bir kişisel araç — demo veya prototip değil. Lütfen kapsamı burada listelenenle sınırlı tut, gereksiz genişletme yapma.

## Teknik gereksinimler

- **Three.js** kullanılarak görsel/etkileşimli 3D sahne inşa edilmeli (CDN üzerinden, örn. unpkg/jsdelivr — ücretsiz, açık kaynak, API anahtarı gerektirmez).
- Tek bir HTML dosyası (ya da en fazla birkaç dosya) olarak teslim edilmeli; build/derleme adımı gerektirmemeli, doğrudan tarayıcıda açılabilmeli.
- **Kullanım sırasında internet bağlantısı olması beklenebilir** — bu proje offline çalışmak zorunda değil (adres arama gibi özellikler için canlı bir servise bağlanması sorun değil).
- Sadece **ücretsiz** kaynaklar/servisler kullanılmalı; ücretli API, kredi kartı veya kayıt gerektiren hiçbir servis kullanılmamalı.
- Adres arama için OpenStreetMap **Nominatim** (ücretsiz, anahtarsız) kullanılabilir — sıralı istek + istekler arası ~1 saniye bekleme ile nazik kullanım politikasına uyulmalı.
- Girilen veriler (eklenen yerler, otel, öncelik puanları) tarayıcıda **localStorage** ile kalıcı saklanmalı; sayfa kapatılıp açıldığında kaybolmamalı.
- Mobilde (telefon tarayıcısında) de düzgün çalışmalı — seyahat sırasında telefondan kullanılacak.

## Görsel yön

Three.js'in asıl gücü 3 boyutlu görselleştirme — bunu gerçek anlamda kullanan, sıradan bir 2D harita uygulaması gibi durmayan bir tasarım istiyorum. **Stil: low-poly.**

- **Low-poly 3D estetik**: Zemin/çevre öğeleri (varsa tepecikler, blok binalar, ağaç yerine geçen basit koniler vb.) düz yüzeyli, faset faset, flat-shading bir görünümde olmalı (Three.js'te `flatShading: true` ile `MeshStandardMaterial`/`MeshPhongMaterial`, düşük poligon sayılı elle üretilmiş geometriler). Doku/texture kullanma — sade, birkaç tonluk (3–5 renk) düz yüzey renkleri tercih et. Hafif yönlü ışık + ambient ışık kombinasyonuyla facetlerin birbirinden ayrışan gölgelenmesi görünsün, bu low-poly hissin asıl kaynağı.
- Gerçek harita tile'ları (Google/Mapbox tarzı) kullanmaya **çalışma** — pratik değil, lisans sorunu doğurabilir. Bunun yerine şehir merkezini orijin kabul edip, eklenen her yerin enlem/boylamını basit bir düzlemsel projeksiyonla (equirectangular yaklaşık: metre cinsinden x/z ofseti) low-poly zemin üzerinde konumlandır.
- Eklenen yerler, low-poly pin/marker geometrileriyle (basit koni, düşük poligonlu prizma vb.) gösterilsin; otel farklı bir renk/şekille ayırt edilsin.
- **Rota görselleştirmesi**: Hesaplanan sıralama, pin'leri birbirine bağlayan low-poly bir "patika/şerit" olarak çizilsin — ince bir tüp/çizgi değil, zeminden hafif yükseltilmiş, segment segment düz yüzeyli bir şerit (her segment kendi facet'i olan bir mini düzlem). Rota rengi net ve dikkat çekici olsun, geri kalan sahneden ayrışsın.
- **Rotalar anlık güncellenmeli**: Bir yer eklendiğinde, silindiğinde ya da öncelik puanı değiştirildiğinde rota otomatik olarak yeniden hesaplanıp 3D sahnede güncellenmeli — ayrı bir "hesapla" butonuna basmayı beklemeden, veri her değiştiğinde tetiklenen bir yeniden-hesaplama/yeniden-çizim akışı olmalı. Eski rota kaldırılıp yenisi çizilirken kısa ve yumuşak bir geçiş olabilir ama gözle görülür bir gecikme olmamalı.
- **Genel görünüm temiz ve "gerçek bir uygulama" hissi vermeli — çıplak/varsayılan HTML sayfası gibi durmamalı.** Standart tarayıcı form elemanları (input/select/button) yerine özenle stillendirilmiş, tutarlı bir tasarım dili kullan: kendine ait bir tipografi çifti, kendine ait bir renk paleti, tutarlı boşluk/kenarlık kuralları. 3D sahne ile altındaki form/liste/panel alanları aynı görsel dilin parçası olmalı (aynı palet, aynı köşe yuvarlaklığı, tutarlı boşluk) — sahne bir "eklenti" gibi değil, arayüzün doğal bir parçası gibi hissettirmeli.
- Profesyonel ama kurumsal-SaaS klişelerinden (sıradan yuvarlak köşeli kartlar, tek tip gölge, gradyan arka planlar, ALL-CAPS etiketler) kaçınan; kişisel bir "seyahat defteri" hissi veren özgün kararlar ver. Konuya uygun somut renk/tipografi kararları ver, jenerik varsayılanlara düşme.

## Özellikler (kapsam bu liste ile sınırlı)

1. **Şehir sekmeleri**: Barcelona / Milano / Roma. Her şehrin kendi yer listesi, oteli ve 3D sahne merkezi ayrı tutulur.
2. **Yer ekleme — üç yöntem**:
   - Sahneye/zemine tıklayarak (yaklaşık konum, sonra isim/tür/puan formu açılır)
   - Adres yazıp "Bul" ile arayarak (Nominatim geocoding, önizleme pin'i gösterilir, sonra form açılır)
   - **Toplu ekleme tablosu**: ayrı sütunlarla — *Yer adı*, *Adres*, *Puan (1–10)* — her biri kendi giriş kutusunda, satır satır. "+ Satır ekle" ile satır çoğaltılabilir. Gönderildiğinde her satır sırayla geocode edilir (nezaket için aralıklı istek), başarılı eklenenler tablodan silinir, bulunamayanlar kalır.
3. **Otel işaretleme**: Her şehir için tek bir otel; yeni otel eklenince eskisinin yerini alır (onay sorulur). Otel her zaman rotanın sabit başlangıç noktasıdır.
4. **Öncelik puanı**: Her "gezilecek yer" için 1–10 arası "ne kadar gitmek istiyorum" puanı (varsayılan 5).
5. **Rota hesaplama — anlık/otomatik** (bkz. "Algoritma detayları"):
   - Yer eklenince, silinince ya da öncelik puanı değişince rota otomatik olarak yeniden hesaplanır ve 3D sahnede güncellenir; ayrı bir "hesapla" butonuna basmak gerekmez
   - Otelden başlayan, kapalı döngü olmayan (otele dönmek zorunda değil) açık bir sıralama üretir
   - Yüksek puanlı yerler rotada öne alınma eğilimindedir
   - Sonuç: numaralı sıra, her adım için yürüme mesafesi ve süresi, toplam mesafe/süre
   - Belirli bir eşiği (örn. 1800 m) aşan adımlarda "toplu taşıma düşünebilirsiniz" uyarısı, ilgili şehrin bilet paneline yönlendirme
6. **"Toplu taşımayla gidilecek yerler" paneli**: havalimanları ve maç günü stadyumları için seçenek listesi (ulaşım aracı / fiyat / süre / not). Aşağıdaki gömülü veriyi kullan.
7. **"Şehir içi biletler" paneli**: her şehrin genel toplu taşıma bilet tiplerini ve fiyatlarını listeler. Aşağıdaki gömülü veriyi kullan.
8. **Kalıcı saklama**: Tüm yer/otel/puan verisi localStorage'da şehir bazlı saklanır, sayfa yeniden açıldığında geri yüklenir. Bir şehrin verisini toplu silme seçeneği olmalı (onay ile).

## Algoritma detayları (aynen uygula)

```
haversine(a, b) → metre cinsinden kuş uçuşu mesafe (standart formül)

walkEstimate(distM):
  routedDist = distM * 1.3   // yol payı katsayısı
  timeMin = routedDist / 80  // ~4.8 km/s yürüme hızı
  return { distM: routedDist, timeMin }

priorityFactor(score, default=5):
  return 0.5 + score/10      // puan 1 → 0.6 (uzak say), puan 10 → 1.5 (yakın say)

routingCost(i, j) = walkEstimate(haversine(i, j)).distM / priorityFactor(points[j].priority)

Rota inşası:
  1. Otelden (yoksa ilk eklenen yerden) başlayarak en-yakın-komşu (nearest neighbor)
     ile routingCost matrisine göre bir sıralama oluştur.
  2. 2-opt yerel iyileştirme uygula (başlangıç noktası sabit tutulur, açık rota).
  3. Ekranda gösterilecek gerçek mesafe/süre değerleri routingCost DEĞİL,
     walkEstimate(haversine(...)) ile ayrıca hesaplanan gerçek yürüme tahminleridir
     (ağırlıklandırma sadece sıralama kararını etkiler, gösterilen sayıları değil).
```

## Gömülü referans veri (araştırıldı, olduğu gibi kullan — tekrar araştırmana gerek yok)

### Şehir merkezleri (3D sahne orijini için)
- Barcelona: 41.3874, 2.1686
- Milano: 45.4642, 9.1900
- Roma: 41.9028, 12.4964

### Barcelona
**Şehir içi biletler**
| Bilet | Fiyat | Not |
|---|---|---|
| Tekli bilet | 2,90 € | Tek yolculuk (metro/otobüs/tramvay) |
| T-Casual (10 yolculuk) | 13,00 €'dan itibaren | 1 kişilik, bölge sayısına göre artar |
| Hola BCN (2–5 gün sınırsız) | 18,70 € – 43,60 € | Havalimanı metro dönüşü dahil |

**El Prat Havalimanı (BCN) → merkez**
| Ulaşım | Fiyat | Süre | Not |
|---|---|---|---|
| Rodalies R2 Nord treni | 4,95 € | 20–25 dk | Sadece T2'den kalkar — en hızlı/ucuz |
| Metro L9 Sud | 5,90 € | 30–40 dk | Özel bilet gerekir, T-Casual geçmez |
| Aerobús | 7,75 € | ~35 dk | Doğrudan Plaça de Catalunya'ya |
| Taksi | 30–45 € | 20–30 dk | — |

**Camp Nou (maç günü)**
| Ulaşım | Fiyat | Not |
|---|---|---|
| Metro L3 → Palau Reial / Les Corts | 2,90 € | Ana girişe (Arístides Maillol) en yakın |
| Metro L5 → Collblanc / Badal | 2,90 € | Stadyumun diğer tarafı için |
| Tramvay T1/T2/T3 → Palau Reial / Maria Cristina | 2,90 € | Maç sonrası çok kalabalık olur |

### Milano
**Şehir içi biletler**
| Bilet | Fiyat | Not |
|---|---|---|
| Tekli bilet | 2,20 € | 90 dk geçerli, sınırsız aktarma |
| Günlük bilet | 7,60 € | 24 saat |
| 3 günlük bilet | 15,50 € | — |
| 10'luk karnet | 19,50 € | — |

**Linate Havalimanı (LIN) → merkez**
| Ulaşım | Fiyat | Süre | Not |
|---|---|---|---|
| M4 metro | 2,20 € | ~12 dk | Merkeze en hızlı, şehir içi bilet geçerli |
| 73 no'lu otobüs | 2,20 € | 20–30 dk | San Babila'ya |
| Özel transfer | 35–55 € | 15–30 dk | — |

**Malpensa Havalimanı (MXP) → merkez**
| Ulaşım | Fiyat | Süre | Not |
|---|---|---|---|
| Malpensa Express → Cadorna | ~13–15 € | 37–40 dk | En hızlı tren bağlantısı |
| Malpensa Express → Centrale | ~13–15 € | ~51 dk | — |
| Otobüs (Autostradale/Terravision/Flibco/FlixBus) | 4–13 € | 50–70 dk | Milano Centrale'ye |

**San Siro / Stadio Meazza (maç günü)**
| Ulaşım | Fiyat | Not |
|---|---|---|
| Metro M5 → San Siro Stadio | 2,20 € | Stadyuma bitişik durak, Turuncu/Mavi/Kırmızı sektörler için önerilir |
| Metro M1 → Lotto | 2,20 € | Stadyuma ~15 dk yürüyüş, yoğunlukta alternatif |
| Tramvay 16 → Stadio Meazza | 2,20 € | Merkezden, yavaş ama direkt |

### Roma
**Şehir içi biletler**
| Bilet | Fiyat | Not |
|---|---|---|
| BIT bileti | 1,50 € | 100 dk, 1 metro binişi + sınırsız otobüs/tramvay |
| ROMA 24h | 8,50 € | — |
| ROMA 48h | 15,00 € | — |
| ROMA 72h | 22,00 € | — |

**Fiumicino Havalimanı (FCO) → merkez**
| Ulaşım | Fiyat | Süre | Not |
|---|---|---|---|
| Leonardo Express treni | 14,00 € | 32 dk | Direkt Termini'ye — BIT/ATAC bileti geçmez |

**Ciampino Havalimanı (CIA) → merkez**
| Ulaşım | Fiyat | Süre | Not |
|---|---|---|---|
| 520/720 otobüs + metro | 1,50 € (BIT) | değişken | Cinecittà veya Laurentina metrosuna bağlanır |
| Cotral / Terravision otobüsü | ayrı ücretli | değişken | Doğrudan, ATAC bileti geçmez |

*(Not: Roma için şu an bilinen bir maç/stadyum planım yok, o yüzden Roma'da stadyum paneli gerekmiyor.)*

## Kısıtlar

- Kapsamı yukarıdaki listeyle sınırla — ekstra "olsa güzel olur" özellik ekleme.
- Çok kullanıcılı, hesap/login sistemi, backend/sunucu gerektiren hiçbir şey yok — tamamen istemci taraflı (client-side), tek kullanıcı için.
- Ücretli hiçbir servis/kütüphane kullanma.
- Fiyat/süre verileri 2026 başı itibarıyla araştırıldı; kodun içine "seyahatten önce güncelini kontrol edin" notu ekle.

## Teslim formatı

Tek bir `.html` dosyası (gerekirse içine gömülü CSS/JS ile), doğrudan çift tıklayıp tarayıcıda açılabilir, kurulum/derleme adımı gerektirmez.
