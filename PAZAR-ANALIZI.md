# movie-expo — Pazar Analizi Raporu

*Tarih: Temmuz 2026 · Kapsam: film/dizi takip (watchlist & tracking) uygulama pazarı*

## 1. Ürün Özeti

TMDB tabanlı film/dizi keşif ve liste uygulaması: Expo 57 + React Native 0.86 + NativeWind, Supabase auth, arama, favoriler, kişisel listeler ve **paylaşımlı listeler** (ortak liste düzenleme), oyuncu/detay sayfaları. Proje henüz erken aşamada — `app.json`'da isim hâlâ `mobile-base`, mağaza kimliği (bundle id, EAS) ve gelir modeli yok.

## 2. Pazar Görünümü

- Pazarın belirleyici olayı: **TV Time 15 Temmuz 2026'da kapanıyor** — uygulama mağazalardan çekiliyor, tvtime.com kapanıyor ve kullanıcı izleme geçmişi kalıcı siliniyor. Milyonlarca kullanıcı şu anda aktif olarak yeni tracker arıyor. **Bu, kategoriye giriş için son yılların en büyük fırsat penceresi ve rapor tarihinde 3 gün kalmış durumda.**
- Kalan oyuncular farklı problemleri çözüyor: **Letterboxd** (film-odaklı sosyal ağ; dizi/bölüm takibi yok), **Trakt** (Plex/Emby/Kodi/Jellyfin scrobbling + bölüm-seviyesi takip + istatistik), **Simkl** (ücretsiz otomatik takip, film+dizi), **Serializd** (dizi için Letterboxd-vari loglama), **JustWatch** (nerede izlenir + watchlist), **Moviebase/Achriom/Matinee** (bağımsız yeni nesil; AI arama, akış platformu bilgisi standartlaşıyor).
- Kategori standartları 2026'da: film+dizi birlikte, bölüm-seviyesi ilerleme, puanlama/günlük (diary), izleme istatistikleri, **akış servisi bulunabilirliği (30+ platform)** ve **veri içe aktarma** (TV Time/Letterboxd CSV).

### Rakip Karşılaştırma

| Yetenek | Letterboxd | Trakt | Simkl | TV Time (†15 Tem) | **movie-expo** |
|---|---|---|---|---|---|
| Film takibi | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dizi bölüm-seviyesi takip | ❌ | ✅ | ✅ | ✅ | ❌ (dizi yalnızca listeye eklenir) |
| Puan / inceleme / günlük | ✅✅ | ✅ | ✅ | ✅ | ❌ |
| İzleme istatistikleri | ✅ | ✅✅ | ✅ | ✅ | ❌ |
| Akış platformu bilgisi | kısmi | ✅ | ✅ | ✅ | ❌ |
| Scrobbling / entegrasyon | ❌ | ✅✅ | ✅ | ➖ | ❌ |
| Sosyal katman (takip/feed) | ✅✅ | ✅ | kısmi | ✅ | ❌ |
| **Ortak (collaborative) listeler** | kısmi (paid) | kısmi | ➖ | ❌ | ✅ **var** |
| Veri içe aktarma (CSV) | ✅ | ✅ | ✅ | — | ❌ |
| Monetizasyon | abonelik | VIP | VIP | reklam | yok |

## 3. Pazara Göre ÖNE ÇIKAN Yönler 🟢

1. **Paylaşımlı listeler çekirdeğe kurulmuş** — "partnerimle/arkadaşlarımla ortak izleme listesi" pazarın kronik eksiği; Letterboxd'da ücretli ve sınırlı, TV Time'da hiç yok. Realtime ortak liste + "bu akşam ne izleyelim" senaryosu güçlü bir farklılaştırıcı konumlandırma olabilir.
2. **Modern, hızlı teknik taban** — Expo 57 / RN 0.86 / React 19 / NativeWind 4 / Zustand / typed routes. Rakip bağımsız uygulamaların çoğundan daha güncel bir stack; web desteği (react-native-web) hazır — Letterboxd/Trakt'ın web+mobil kapsamına düşük maliyetle ulaşılabilir.
3. **TMDB katmanı temiz ayrıştırılmış** — `lib/tmdb/` (movies, tv, person, search, genres) modüler; film+dizi+kişi verisi zaten akıyor. Bölüm takibi gibi eksiklerin üzerine inşa edileceği temel sağlam.
4. **Zamanlama** — TV Time kapanışıyla oluşan göç dalgası, sıfır bilinirlikle bile kullanıcı kazanma şansı veriyor; ancak bu yalnızca içe-aktarma özelliği varsa değerlenebilir (aşağıda).

## 4. Pazara Göre GERİDE KALAN Yönler 🔴

1. **Dizi bölüm-seviyesi takip yok** *(kategori giriş bileti)* — TV Time göçmenlerinin tek vazgeçilmezi "hangi bölümde kalmıştım". `lib/tmdb/tv.ts` veriyi çekebiliyor ama izleme ilerlemesi modeli (sezon/bölüm işaretleme) hiç yok. Bu olmadan ürün yalnızca film-liste uygulaması.
2. **TV Time / Letterboxd içe aktarma yok** — kapanış 3 gün sonra; kullanıcılar CSV dışa aktarımlarını şimdi alıyor. CSV import olmadan göç dalgasından pay alınamaz. En yüksek aciliyetli eksik.
3. **Puanlama, inceleme, izleme günlüğü yok** — "izledim" durumu bile yok (yalnızca favori/liste). Kategorinin çekirdek döngüsü log→rate→stats burada kurulmamış.
4. **Akış platformu bulunabilirliği yok** — "nerede izlenir" 2026'da hijyen faktörü (JustWatch, Matinee 30+ platform). TMDB'nin watch/providers endpoint'i ile düşük eforla eklenebilir.
5. **İstatistik/özet ekranı yok** — izleme saati, tür dağılımı, yıl özeti (Spotify Wrapped etkisi) rakiplerde retention ve viral paylaşım motoru.
6. **Sosyal katman yok** — arkadaş takibi, aktivite akışı, liste beğenme yok. Paylaşımlı liste iyi bir çekirdek ama tek başına ağ etkisi üretmiyor.
7. **Ürün kimliği ve mağaza hazırlığı yok** — isim `mobile-base`, bundle id/EAS/ikon-splash markalaması, gizlilik politikası, hesap silme akışı yok. (Karşılaştırma: kardeş repo İçsel Harita'da bunların tamamı çözülmüş — oradaki kalıplar taşınabilir.)
8. **Gelir modeli tanımsız** — pazar normu freemium (Trakt VIP ~$30/yıl, Letterboxd Pro ~$19/yıl). Reklamsız + Pro katman kararı erken verilmeli.
9. **Offline önbellek ve push yok** — "yeni bölüm çıktı" bildirimi TV Time'ın en sevilen özelliğiydi; göçmen beklentisi olacak.

## 5. Kullanıcı Sesi — Ekşi Sözlük TV Time başlığı + TR toplulukları

*Kaynak: [eksisozluk.com/tv-time--5407786](https://eksisozluk.com/tv-time--5407786) (7 sayfa) ve öncülü [tvshow time başlığı](https://eksisozluk.com/tvshow-time--4574367). Not: Başlık sayfaları bot korumasına takıldığı için arama indeksi üzerinden parça parça çıkarıldı; tema analizi aşağıda, birebir tam metin değil.*

Başlığın yıllara yayılan seyri üç döneme ayrılıyor ve her dönem movie-expo için doğrudan ürün sinyali içeriyor:

### Dönem 1 — Sevgi (neden bağlandılar)
- **"Hangi bölümde kalmıştım" işaretleme** — başlığın kuruluş nedeni; Dizimag kapanınca takip problemi çözen uygulama olarak övülmüş.
- **Android widget** — "muhteşem" diye ayrıca övülen tek özellik; yeni bölüm tarihi ana ekranda.
- **Takvim + yayın saati bildirimi + geri sayım** — "dizim ne zaman geliyor" sorusunun cevabı.
- **İstatistikler** — "hayatımın kaç ayını diziyle geçirmişim" verisi en çok paylaşılan/konuşulan özellik (viral değeri yüksek).
- **Bölüm-bazlı, spoiler-korumalı yorum akışı** — "feed kısmı güzel, bölüm bazlı yorum atılıyor, spoiler yemiyorsun".
- **Arkadaş takibi** — "yakın arkadaşları üye yaparsan kim ne izliyor takibi zevkli".
- Oyuncu bilgisi, puanlar, izlenenlere göre öneri.

### Dönem 2 — Hayal kırıklığı (neden nefret ettiler ama kalamadılar)
- **Redesign katliamı:** "son güncellemesiyle sevdiğim ve alıştığım tüm özellikleri yerle bir olmuş", "arayüzü perişan hale getirmişler, App Store yorumlarında kıyamet kopuyor".
- **Güvenilmezlik:** "kullanması son 1 senedir eziyet… günün yarısında çalışmıyor", her güncelleme daha kötü.
- **Kilitlenme itirafı:** kullanıcılar yine de kalmış çünkü "alternatifi yok (en azından benim bildiğim)". Yıllarca biriken izleme geçmişi geçiş maliyeti yaratmış.
- Letterboxd'un dizi tarafı için dengi olmaması ayrıca dile getirilmiş ("keşke dizi için de Letterboxd olsa").

### Dönem 3 — Göç (Temmuz 2026)
- Kapanış duyurusu (15 Temmuz 2026, tüm veriler siliniyor; neden: Whip Media'nın AI odağına dönmesi ve ücretsiz modelin sürdürülemezliği — [TechCrunch](https://techcrunch.com/2026/07/02/popular-tv-tracking-app-tv-time-is-shutting-down-as-company-focuses-on-ai/)).
- Kullanıcılar **GDPR self-service export** aracıyla ([gdpr.tvtime.com](https://gdpr.tvtime.com/gdpr/self-service)) verilerini indiriyor; göç hedefleri Trakt, Simkl, Serializd, Sofa Time (iOS).
- Önemli nüans: kullanıcılar export dosyalarını ellerinde tutacağı için **TV Time CSV içe aktarıcı, 15 Temmuz'dan sonra da değerli** — göç dalgası kapanışla bitmiyor, aylarca sürer.

### movie-expo için çıkarımlar
1. Ürünün çekirdeği ekşi kullanıcısının diliyle: *"hangi bölümde kaldım + dizim ne zaman geliyor + hayatımın kaçı dizi"*. Üçü de şu an movie-expo'da yok — yol haritasının ilk üç sırası bunlar olmalı.
2. **Spoiler-korumalı bölüm yorumları**, paylaşımlı listelerin yanına eklenirse TV Time'ın kimsenin devralmadığı sosyal mirası devralınabilir (Trakt/Simkl'de zayıf, Serializd dizi-only).
3. **Anti-pattern dersi:** kullanıcılar arayüz devrimlerinden ve güvenilmezlikten nefret ediyor ama veri birikimi varsa terk edemiyor. Ders: (a) izleme geçmişi = kilitlenme varlığı, erken kur; (b) redesign'ları asla big-bang yapma.
4. Widget, TR kullanıcısında beklenenden yüksek değer görüyor — düşük eforlu, yüksek algı.

## 6. Öncelik Önerileri

| # | Aksiyon | Gerekçe | Efor |
|---|---|---|---|
| 1 | TV Time CSV içe aktarma | Göç dalgası — zaman kritik | Düşük-Orta |
| 2 | İzlendi durumu + bölüm-seviyesi dizi takibi | Kategori giriş bileti | Yüksek |
| 3 | Akış platformu bilgisi (TMDB watch/providers) | Hijyen faktörü, düşük efor | Düşük |
| 4 | Puan + günlük (diary) modeli | Çekirdek döngüyü tamamlar | Orta |
| 5 | Marka + mağaza hazırlığı (isim, ikon, EAS, gizlilik) | Yayınsız pazar payı alınamaz | Orta |
| 6 | "Yeni bölüm" push bildirimi | TV Time göçmen beklentisi | Orta |
| 7 | Yıllık özet / istatistik paylaşım kartı | Viral büyüme motoru | Orta |

## 7. Kaynaklar

- [Achriom — Best TV Tracking Apps 2026 (TV Time kapanışı)](https://www.achriom.com/blog/best-tv-tracking-apps/)
- [Achriom — Best Movie Tracking Apps 2026](https://www.achriom.com/blog/best-movie-tracking-apps/)
- [Achriom — Letterboxd vs Trakt](https://www.achriom.com/blog/letterboxd-vs-trakt/)
- [TWiT — JustWatch, Letterboxd, Trakt karşılaştırma](https://twit.tv/posts/tech/justwatch-letterboxd-trakt-which-app-should-you-use-manage-your-watchlist)
- [Moviebase — TV Time Alternatives 2026](https://moviebase.app/resources/tv-time-alternatives)
- [Matinee — Best Movie Tracker Apps 2026](https://getmatinee.com/blog/best-movie-tracker-apps)
- [Slant — Trakt vs Letterboxd](https://www.slant.co/versus/19287/33805/~trakt_vs_letterboxd)
