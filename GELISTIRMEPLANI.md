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
- [ ] Migration `0006_watch_log.sql`: `watch_log(id, user_id, media_id, media_type, watched_at, rating smallint null check 1-10, note text null, created_at)` + RLS (saved_media kalıbı kopyalanır).
- [ ] Detay ekranına "İzledim" butonu + tarih/puan girişli hızlı log sheet'i.
- [ ] `lists.store.ts` kalıbında `watchLog.store.ts`.

### 1b. Dizi bölüm-seviyesi takip
- [ ] `lib/tmdb/tv.ts`'e sezon endpoint'i: `getSeasonDetails(tvId, seasonNumber)` → `/tv/{id}/season/{n}` (bölüm listesi, yayın tarihleri, still'ler).
- [ ] Migration `0007_episode_progress.sql`: `episode_progress(user_id, show_id, season_number, episode_number, watched_at)` — PK `(user_id, show_id, season_number, episode_number)`; toplu işaretleme için tek tek satır (istatistik bunu ister).
- [ ] Dizi detay ekranına sezon akordeonu: bölüm satırı → tek dokunuş işaretleme; sezon başlığında "buraya kadar işaretle" (upsert batch).
- [ ] Ana sekmeye **"İzlemeye devam et"** rafı: son işaretlenen bölümden sonraki bölüm (`episode_progress` + TMDB `next_episode_to_air` birleşimi).

### 1c. Watchlist'in yeni anlamı
- [ ] `saved_media` watchlist'i korunur; izlendi loglanınca watchlist'ten otomatik düşürme opsiyonu.

**Kabul ölçütü:** Bir dizide 3 sezonu 30 saniyede işaretleyip ana ekranda "sıradaki bölüm" kartını görmek.

## Faz 2 — TV Time Göçü 🚨 *(zamana duyarlı · ~1 hafta, Faz 1b'ye bağımlı)*

TV Time 15 Temmuz'da kapanıyor ama kullanıcılar GDPR export dosyalarını (`gdpr.tvtime.com/gdpr/self-service`) elinde tutacak — **içe aktarıcı kapanıştan sonra da aylarca değerli.**

- [ ] `expo-document-picker` + export formatı parser'ı (`seen_episode.csv` / `tracking-prod-records*.csv` varyantları; TVDB id bazlı).
- [ ] Kimlik eşleştirme: TVDB id → TMDB `/find/{id}?external_source=tvdb_id` (`lib/tmdb/find.ts` yeni).
- [ ] Eşleşmeyenler için elle arama-eşleştirme ekranı (atlanabilir).
- [ ] Sonuç: `episode_progress` + `watch_log` toplu insert (Supabase batch, 500'lük parçalar).
- [ ] Letterboxd CSV import (film günlüğü — aynı altyapı, düşük ek maliyet).
- [ ] Onboarding'e "TV Time'dan mı geliyorsun? Dosyanı sürükle" adımı.

**Kabul ölçütü:** 2.000 bölümlük gerçek bir TV Time export'u < 1 dakikada, eşleşme oranı ≥ %95 ile içeri alınıyor.

## Faz 3 — Hijyen Özellikler *(~1.5 hafta)*

- [ ] **Akış platformu bilgisi**: TMDB `watch/providers` (append_to_response ile mevcut detay çağrısına eklenir — ekstra istek yok); bölge cihaz locale'inden, ayarlardan değiştirilebilir. Detay ekranında "Nerede izlenir?" satırı + JustWatch atfı (TMDB koşulu).
- [ ] **Takvim + bildirim**: "Takvim" ekranı (takip edilen dizilerin `next_episode_to_air`'ı); `expo-notifications` yerel bildirim — sunucu gerektirmez: uygulama açılışında 7 günlük yayın planını yerel bildirime kurar. (Push/edge-function versiyonu Faz 5+.)
- [ ] **Puanlama görünürlüğü**: profíl ve listelerde kullanıcının puanı; 1a'daki `rating` alanı UI'da tamamlanır.

## Faz 4 — İstatistik & Viral Döngü *(~1 hafta)*

Ekşi başlığında en çok konuşulan özellik — retention + paylaşım motoru:

- [ ] İstatistik ekranı: toplam izleme süresi (bölüm runtime × işaretli bölüm; TMDB `episode_run_time`/film `runtime`), "hayatının X günü", tür dağılımı, yıllık grafik. Hesaplama tek pure modülde (`lib/stats.ts`) + birim test.
- [ ] **Paylaşılabilir kart** (PNG): aylık/yıllık özet — `react-native-view-shot` (İçsel Harita repo'sundaki `src/features/share/` kalıbı doğrudan taşınabilir).
- [ ] "Yıl Özeti" (Aralık'ta öne çıkar — Wrapped etkisi).

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
