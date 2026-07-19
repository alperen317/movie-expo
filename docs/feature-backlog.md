# Özellik Backlog'u

Uygulama genel incelemesinden (2026-07) çıkan, henüz yapılmamış özellik
fikirleri. Üç madde (izleme günlüğü ekranı, öneri geri bildirim döngüsü,
Listem sekmelerinde sıralama/filtre) aynı incelemeden çıkıp uygulandı; bu
belge kalanları önceliklendirilmiş halde tutar.

Öneri motorunun kendi yol haritası ayrı belgededir:
`docs/recommendation-engine-plan.md` (Faz 3+, günlük sunucu cache'i).

---

## 1. Derin bağlantı + içerik paylaşımı

**Efor:** Orta · **Değer:** Yüksek (büyüme/viral döngü)

Altyapı hazır ama kullanılmıyor: `app.json`'da `previously` scheme'i tanımlı,
`expo-linking` ve `expo-sharing` kurulu; buna rağmen hiçbir ekran
paylaşılabilir link üretmiyor.

- Detay ekranına "Paylaş" butonu: `previously://details/{id}?type={movie|tv}`
  + uygulaması olmayanlar için web fallback URL'i.
- Paylaşımlı liste davetlerinde koda ek olarak tıklanabilir davet linki
  (`previously://join/{code}`); `InviteModal.tsx` zaten `Share.share`
  kullanıyor, yalnızca mesaja link eklemek kalıyor.
- Expo Router derin bağlantıları dosya-tabanlı rotalarla otomatik eşler;
  yapılacak iş çoğunlukla gelen linki karşılayıp doğru ekrana düşürmek ve
  oturum yoksa girişten sonra hedefe devam etmek.

## 2. Davet/anket push bildirimleri

**Efor:** Orta-Yüksek · **Değer:** Yüksek (paylaşımlı listelerin nabzı)

Yerel bölüm hatırlatıcısı var (`lib/notifications/episodeReminders.ts`,
7 günlük pencere, saat 09:00) ama **sunucu kaynaklı** push yok: davet veya
anket yalnızca uygulama açıkken (realtime) görünüyor.

- Expo Push token'ı profil satırına kaydedilir (`profiles.push_token`).
- Mevcut Edge Function desenini (`send-list-invite-email` gibi) izleyen bir
  `send-push` fonksiyonu; davet oluşturma ve anket başlatma RPC'lerinden
  tetiklenir.
- Bildirim tercihi profil ayarlarına eklenir (çökme raporu toggle deseni).

## 3. Yıllık özet / "Previously Wrapped"

**Efor:** Orta · **Değer:** Sezonluk ama paylaşım potansiyeli yüksek

- İstatistik ekranı + `ViewShot`/`expo-sharing` paylaşım kartı altyapısı
  hazır (`ShareableStatsCard`).
- Zevk profili (`buildTasteProfile`) en sevilen tür/on yıl verisini zaten
  üretiyor; yıl sonu kaydırmalı özet ekranı (toplam saat, en çok izlenen
  türler, favori on yıl, en yüksek puanlanan başlıklar) çoğunlukla
  kompozisyon işi.
- Aralık ayında ana ekrana giriş kartıyla duyurulur.

## 4. Kişi takibi

**Efor:** Orta · **Değer:** Orta

- Oyuncu ekranı (`app/(app)/actor/[id].tsx`) ve kişi-affinity altyapısı
  (`buildPersonAffinities`, `discoverMoviesByPerson`) hazır.
- "Takip et" → `followed_people` tablosu (RLS'li); takip edilen kişinin
  yeni/yaklaşan filmi `upcoming` ile kesişince bildirim veya ana ekran
  satırı.
- Madde 2'nin push altyapısıyla birleşirse bildirime, yoksa yalnızca ana
  ekran satırına düşer (push olmadan da değerli).

## 5. Offline dayanıklılık

**Efor:** Orta · **Değer:** Sessiz ama gerçek kalite artışı

- Favoriler / izleme listesi / izleme günlüğü yalnızca Supabase'den
  okunuyor; bağlantısızken bu ekranlar boş kalıyor.
- Zustand store'larına AsyncStorage persist katmanı (uygulamada yerleşik
  desen: `languagePreference`, `themePreference`, `mediaMetadataCache`).
- İkinci adım (isteğe bağlı): offline yazma kuyruğu — bağlantı gelince
  izleme kayıtlarını sırayla gönder. İlk adım salt-okunur cache'dir ve tek
  başına yeterli değer üretir.

---

## Önerilen sıra

| # | Özellik | Efor | Ön koşul |
| --- | --- | --- | --- |
| 1 | Derin bağlantı + paylaşım | Orta | Yok |
| 5 | Offline okuma cache'i | Orta | Yok |
| 2 | Push bildirimleri | Orta-Yüksek | Expo push kurulumu |
| 4 | Kişi takibi | Orta | İdealde #2 |
| 3 | Yıllık özet | Orta | Aralık'a yetişmesi yeterli |

1 ve 5 bağımsız başlangıçlardır; 2 tamamlanınca 4'ün bildirim ayağı açılır;
3 sezonluk olduğu için yıl sonuna planlanır.
