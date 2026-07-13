# movie-expo — Geliştirme Planı

*Temmuz 2026 · `PAZAR-ANALIZI.md` bulgularının uygulanabilir yol haritası. Mevcut kod gerçekliğine göre yazıldı: `saved_media` (favori + watchlist), paylaşımlı listeler (realtime, üyelik, RLS) ve TMDB katmanı hazır; izlendi durumu, bölüm takibi, puanlama ve istatistik yok.*

## Ürün Tezi

> **"Birlikte izleyenlerin takip uygulaması."** Bölüm-seviyesi takip + TV Time göçmenlerini karşılayan içe aktarma + pazarın kimsede olmayan güçlü ortak-liste/sosyal katmanı.

Ekşi Sözlük TV Time başlığından damıtılan çekirdek beklenti planın omurgası: *"hangi bölümde kaldım" + "dizim ne zaman geliyor" + "hayatımın kaçı dizi"*.

---

## Faz 0 — Kimlik ve Kararlar (yarım gün, kod öncesi)

Bloklamayan ama her şeyi etkileyen kararlar:

- [ ] **Ürün adı** — `app.json` hâlâ `mobile-base`. İsim + slug + scheme + bundle id (`com.<org>.<app>`) tek commit'te değişmeli (derin link ve auth redirect'leri etkiler).
- [ ] **Gelir modeli kararı** — öneri: v1 tamamen ücretsiz (büyüme fazı), Pro katmanı Faz 6'da (gelişmiş istatistik + tema + sınırsız paylaşımlı liste). Reklam **yok** — TV Time'ın reklam boğulması şikayetleri fırsat.
- [ ] **TMDB kullanım koşulları** — atıf zorunluluğu ("This product uses the TMDB API…") ayarlar/hakkında ekranına.

## Faz 1 — Çekirdek Takip Modeli 🎯 *(kategori giriş bileti · ~2 hafta)*

### 1a. İzleme günlüğü (film + dizi geneli)
- [x] Migration `0006_watch_log.sql`: `watch_log(id, user_id, media_id, media_type, watched_at, rating smallint null check 1-10, note text null, created_at)` + RLS (saved_media kalıbı kopyalanır).
- [x] Detay ekranına "İzledim" butonu + tarih/puan girişli hızlı log sheet'i (`components/watchLog/WatchLogSheet.tsx`).
- [x] `lists.store.ts` kalıbında `watchLog.store.ts`.

### 1b. Dizi bölüm-seviyesi takip
- [x] `lib/tmdb/tv.ts`'e sezon endpoint'i: `getSeasonDetails(tvId, seasonNumber)` → `/tv/{id}/season/{n}` (bölüm listesi, yayın tarihleri, still'ler).
- [x] Migration `0007_episode_progress.sql`: `episode_progress(user_id, show_id, season_number, episode_number, watched_at)` — PK `(user_id, show_id, season_number, episode_number)`; toplu işaretleme için tek tek satır (istatistik bunu ister).
- [x] Dizi detay ekranına sezon akordeonu (`components/watchLog/SeasonAccordion.tsx`): bölüm satırı → tek dokunuş işaretleme.
- [ ] Sezon başlığında "buraya kadar işaretle" toplu işaretleme (upsert batch) — henüz yok, tek tek dokunmak gerekiyor.
- [x] Ana sekmeye **"İzlemeye devam et"** rafı (`components/home/ContinueWatchingRow.tsx`): son işaretlenen bölümden sonraki bölüm.

### 1c. Watchlist'in yeni anlamı
- [x] `saved_media` watchlist'i korunur; izlendi loglanınca watchlist'ten otomatik düşürme opsiyonu (`WatchLogSheet` "Remove from Watchlist" onay kutusu, varsayılan işaretli → `watchLog.store.ts` `logWatch`/`updateWatch` içinde `toggleWatchlist` çağrısı).

**Kabul ölçütü:** Bir dizide 3 sezonu 30 saniyede işaretleyip ana ekranda "sıradaki bölüm" kartını görmek.

## Faz 2 — TV Time Göçü 🚨 *(zamana duyarlı · ~1 hafta, Faz 1b'ye bağımlı)*

TV Time 15 Temmuz'da kapanıyor ama kullanıcılar GDPR export dosyalarını (`gdpr.tvtime.com/gdpr/self-service`) elinde tutacak — **içe aktarıcı kapanıştan sonra da aylarca değerli.**

- [x] `expo-document-picker` + `jszip` ile zip'i uygulama içinde açıp export parser'ı (`lib/importers/tvtime.ts`, `lib/importers/letterboxd.ts`, `lib/importers/csv.ts`, `lib/importers/zip.ts`). Gerçek export dosyaları incelendi: `tracking-prod-records.csv` (movie watch/towatch) + `tracking-prod-records-v2.csv` (takip edilen diziler).
- [x] ~~Kimlik eşleştirme: TVDB id → TMDB `/find`~~ **Plan değişti**: gerçek TV Time export'unda TVDB/TMDB id yok (sadece TV Time internal UUID'leri var). Eşleştirme başlık+yıl bazlı TMDB arama ile yapılıyor (`lib/tmdb/search.ts` `searchMovies`/`searchTVShows`, `lib/importers/match.ts`).
- [x] Eşleşmeyenler için elle arama-eşleştirme ekranı (`app/(app)/import.tsx` "Gözden geçir gerekiyor" bölümü, mevcut `searchMulti` ile).
- [x] Sonuç: `watch_log` + `saved_media` toplu insert (`addWatchLogEntriesBatch`, `addSavedMediaBatch`, 500'lük parçalar).
- [x] Letterboxd CSV import (`lib/importers/letterboxd.ts`: diary.csv öncelikli, yoksa watched.csv+ratings.csv birleşimi; watchlist.csv).
- [ ] Onboarding'e "TV Time'dan mı geliyorsun?" adımı — **kapsam dışı bırakıldı**, uygulamada henüz onboarding akışı yok. Import, Profile ekranından erişiliyor (`app/(app)/(tabs)/profile.tsx` "Import from TV Time / Letterboxd").
- [ ] Bölüm-seviyesi TV Time importu (`episode_progress`) — **kapsam dışı bırakıldı**, incelenen gerçek export'ta hiç episode-level veri yoktu (`ep_watch_count` her satırda 0); sahte veriyle doğrulanamayacak bir yol eklemek yerine gerçek veriyle karşılaşılırsa ayrı iş olarak ele alınacak. Takip edilen diziler (`is_followed=true`) watchlist'e ekleniyor, kullanıcı bölümleri `SeasonAccordion`'dan kendi işaretliyor.

**Kabul ölçütü:** Gerçek bir TV Time + Letterboxd export'u uygulama içinden (zip seç → eşleştir → gözden geçir → içe aktar) hatasız tamamlanıyor; yüksek güvenli eşleşmeler otomatik seçili geliyor, düşük güvenli/eşleşmeyenler elle aranabiliyor.

## Faz 3 — Hijyen Özellikler *(~1.5 hafta)*

- [x] **Akış platformu bilgisi**: TMDB `watch/providers` (append_to_response ile mevcut detay çağrısına eklenir — ekstra istek yok); bölge cihaz locale'inden (henüz ayarlardan değiştirilemiyor — sonraki faza bırakıldı). Detay ekranında "Nerede izlenir?" satırı + JustWatch atfı (TMDB koşulu).
- [x] **Takvim + bildirim**: `/calendar` ekranı (takip edilen dizilerin `next_episode_to_air`'ı); `expo-notifications` yerel bildirim — uygulama açılışında 7 günlük yayın planını yerel bildirime kurar.
- [x] **Puanlama görünürlüğü**: My List'e "Watched" sekmesi + MovieCard'da kişisel puan rozeti (TMDB puanının yerine); Profile'da 3. "Watched" sayacı.

## Faz 4 — İstatistik & Viral Döngü *(~1 hafta)*

Ekşi başlığında en çok konuşulan özellik — retention + paylaşım motoru:

- [x] İstatistik ekranı: `/stats` — toplam izleme süresi (bölüm runtime × işaretli bölüm; TMDB `episode_run_time`/film `runtime`), "hayatının X günü" (gün/saat), tür dağılımı, {yıl} aylık aktivite grafiği. Hesaplama tek pure modülde (`lib/stats.ts`) + Jest birim testleri (`lib/stats.test.ts`).
- [x] **Paylaşılabilir kart** (PNG): `react-native-view-shot` + `expo-sharing` ile `/stats` ekranındaki özet kart (`components/stats/ShareableStatsCard.tsx`) native share sheet'e gönderiliyor.
- [x] "Yıl Özeti": ayrı ekran yerine `/stats`'ta "All Time / This Year" segment kontrolü + Aralık ayında banner + varsayılan sekme "This Year".

## Faz 5 — Sosyal Katman *(~2 hafta)*

Mevcut paylaşımlı liste altyapısının üstüne, TV Time'ın devralınmamış mirası:

- [ ] **Spoiler-korumalı bölüm yorumları**: `episode_comments` tablosu; yorum yalnızca o bölümü işaretlemiş kullanıcıya açık gösterilir (RLS değil, istemci blur + "spoiler'ı göster") — TV Time'ın en sevilen sosyal özelliği, Trakt/Simkl'de zayıf.
- [ ] **"Bu akşam ne izleyelim?"**: paylaşımlı listeden rastgele/oylamayla ortak seçim — mevcut realtime altyapısıyla ucuz, konumlandırmanın ("birlikte izleyenler") vitrini.
- [ ] Profil takibi + basit aktivite akışı (arkadaşın ne izledi) — v1.1'e kayabilir.

## Faz 6 — Mağaza & Gelir *(~1 hafta)*

İçsel Harita reposundaki çözülmüş kalıplar buraya taşınır:

- [ ] İkon/splash/adaptive icon; EAS profilleri (`eas.json`); typed store metadata + ASO ("TV Time alternatifi" araması hâlâ sıcakken).
- [ ] Gizlilik politikası + koşullar linkleri; **hesap silme akışı** (Apple 5.1.1v — İçsel Harita'daki `delete_account()` RPC kalıbı).
- [ ] Sentry + basit analitik (opt-out'lu), yine mevcut kalıptan.
- [ ] Pro katman (RevenueCat kalıbı hazır): gelişmiş istatistik, temalar, sınırsız paylaşımlı liste üyesi.

---

## Sıralama Gerekçesi ve Riskler

| Risk | Etki | Önlem |
|---|---|---|
| TV Time export formatı belgesiz/varyantlı | Faz 2 gecikir | Gerçek export dosyaları toplanmalı (topluluktan/kendi hesabından) — parser'ı fixture'larla test et |
| TMDB↔TVDB eşleşme boşlukları | İçe aktarma eksik kalır | Elle eşleştirme ekranı + "eşleşmeyenler" raporu |
| Bölüm işaretleme UX'i hantal kalırsa | Çekirdek değer algılanmaz | Faz 1 kabul ölçütü: 3 sezon / 30 sn; toplu işaretleme birinci sınıf |
| Sosyal özellikler boş-oda problemi | Faz 5 etkisiz görünür | Önce ortak-liste (küçük grup değeri), feed'i sona bırak |

**Toplam kaba tahmin:** ~8-9 hafta tek geliştiriciyle. Faz 1+2 = pazarlanabilir minimum ("TV Time verini getir, kaldığın yerden devam et"); Faz 3-4 = mağaza lansmanı; Faz 5-6 = farklılaşma ve gelir.
