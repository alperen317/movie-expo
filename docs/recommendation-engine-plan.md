# Öneri & Keşif Motoru — Planı

Bu belge, _Previously_ uygulamasına kişiselleştirilmiş bir öneri/keşif motoru
eklemek için aşamalı bir yol haritasıdır. Fazlar bağımsız olarak
yayınlanabilir; her faz tek başına değer üretir.

## Bağlam ve Kısıtlar

Plan, mevcut kod tabanına dayanır:

- **Katmanlı mimari** korunur: hesaplama `lib/` içinde saf (test edilebilir)
  fonksiyonlar, durum `stores/` içinde Zustand store'ları, ekranlar yalnızca
  store'lardan okur.
- **TMDB istemcisi** (`lib/tmdb/`) ve `mediaMetadataCache.ts` zenginleştirme
  altyapısının temelini sağlar.
- Ana ekran bileşenleri (`HeroCarousel`, `MediaRow`, `ContinueWatchingRow`)
  satır-tabanlıdır; öneri rayları buraya doğal oturur.

### Plana Etki Eden İki Tespit

1. **Veri modeli şu an öneri için yetersiz.** `watch_log` tablosunda tür
   bilgisi tek bir `genre text` kolonudur (tek tür, isim olarak). Gerçek bir
   motor `genre_ids integer[]`, oyuncu/yönetmen, keyword gibi zengin sinyaller
   ister. Faz 2 bunu bir migration ile çözer.
2. **Kullanıcılar-arası veri RLS'e takılır.** Collaborative filtering "başka
   kullanıcılar ne izledi" verisine bakar, ama RLS her kullanıcıyı kendi
   satırlarına kilitler (doğru davranış). Bu yüzden Faz 4, ham veriyi açmadan
   anonim/agregat bir katman kullanır — projede zaten var olan
   `SECURITY DEFINER` deseniyle.

---

## Faz 1 — Temel: TMDB Öneri Uçları + Keşif Rayları

**Efor:** ~1-2 gün · **Kişiselleştirme:** Orta · **Cold-start çözümü:** Evet

Motorun fallback katmanı; sonraki fazlar boşsa bile ekran dolu kalır.

- `lib/tmdb/`'ye `fetchRecommendations(mediaType, id)` ve `fetchSimilar` eklenir.
- Detay ekranına (`app/(app)/details/[id].tsx`) "Benzer içerikler" satırı.
- Ana ekrana `top_rated`, `upcoming` ve türe göre keşif satırları.
- Hiç izleme geçmişi olmayan yeni kullanıcı bu rayları görür (cold start).

## Faz 2 — Zevk Profili + İçerik-Tabanlı Skorlama

**Efor:** ~3-5 gün · **Kişiselleştirme:** Yüksek · Tamamen istemci tarafında.

Kendi algoritmanın ilk versiyonu:

- **Şema zenginleştirme:** `watch_log`'a `genre_ids integer[]` migration'ı;
  mevcut satırlar `mediaMetadataCache` üzerinden TMDB'den backfill edilir.
- `lib/recommendations/tasteProfile.ts`: izleme + rating verisinden ağırlıklı
  profil çıkarır — tür ağırlıkları (rating 8+ izleme ×2 sayılır, düşük rating
  negatif sinyal), favori oyuncu/yönetmenler, yayın on yılı tercihi, film/dizi
  oranı.
- `lib/recommendations/score.ts`: TMDB `discover` uçlarından aday havuzu
  çekilir, her aday profile göre skorlanır, **izlenmişler ve watchlist'tekiler
  elenir**, çeşitlilik için tür başına üst sınır uygulanır.
- Ana ekranda kişisel satırlar: _"Bilim-kurgu sevginize göre"_,
  _"Christopher Nolan izlediğiniz için"_, _"90'lar filmleri sizin işiniz"_.
- Hesap `lib/recommendations/` içinde saf fonksiyonlar (jest ile test edilir),
  durum `stores/recommendations.store.ts`'te tutulur.

## Faz 3 — pgvector ile Semantik Benzerlik

**Efor:** ~1 hafta · "Gerçek" motor buradan başlar.

- Supabase'de `pgvector` extension + `media_embeddings` tablosu
  (media_id, media_type, embedding).
- Bir Edge Function (mevcut `send-auth-email` gibi) film/dizinin özet + tür +
  keyword metnini embedding'e çevirir ve cache'ler. Her başlık **bir kez**
  hesaplanır, tüm kullanıcılar paylaşır — maliyet düşük.
- Kullanıcının zevk vektörü = yüksek puanladığı içeriklerin rating-ağırlıklı
  embedding ortalaması.
- `match_media(user_vector)` RPC'si cosine benzerliğiyle aday döndürür →
  _"İzlediklerinize ruhen benzeyenler"_.
- Tür eşleşmesinin yakalayamadığını yakalar: "yavaş tempolu, atmosferik
  gerilim" gibi örüntüler.

## Faz 4 — Collaborative Filtering: "Sizin Gibi İzleyenler"

**Efor:** ~1-2 hafta · Anlamlı sinyal için kullanıcı kitlesi gerekir.

- Anonim agregat katman: `SECURITY DEFINER` RPC veya materialized view —
  _"X'i beğenenlerin %60'ı Y'yi de beğendi"_ (co-occurrence matrisi). Ham
  kullanıcı verisi asla açılmaz; eşik altı (ör. <5 kullanıcı) çiftler gizlilik
  için elenir.
- Paylaşımlı listeler zaten sosyal graf başlangıcıdır: _"Liste arkadaşlarının
  bu hafta izledikleri"_ satırı düşük maliyetli, yüksek değerli ara üründür.
- **Dürüst not:** Bu faz ancak birkaç yüz aktif kullanıcıyla anlamlı sinyal
  üretir; o yüzden en sona kondu. Faz 2+3 tek kullanıcıyla bile çalışır.

## Faz 5 (Opsiyonel) — Doğal Dilde Keşif

Edge Function arkasında LLM: kullanıcı _"90'lar tarzı, karanlık ama komik bir
şey"_ yazar → LLM bunu TMDB discover parametrelerine/başlık listesine çevirir,
sonuçlar zevk profiliyle yeniden sıralanır. API anahtarı sunucuda kalır,
istemciye sızmaz.

---

## Kesişen İşler

- **Geri bildirim döngüsü:** Öneri kartlarına "ilgilenmiyorum" aksiyonu
  (`recommendation_feedback` tablosu) — motor zamanla öğrenir. Öneriden
  watchlist'e eklenme oranı motorun başarı metriği olur.
- **Cache & maliyet:** Öneriler Supabase'de günlük hesaplanıp cache'lenir; her
  ekran açılışında TMDB'ye düzinelerce istek atılmaz.
- **Test:** Profil çıkarma ve skorlama saf fonksiyon olduğundan mevcut jest
  düzenine doğrudan girer.

## Önerilen Sıra

Faz 1 → 2 ardışık yapılıp yayınlanır; Faz 3 kullanıcı tepkisine göre eklenir.
Faz 1+2 tek başına "uygulama bana ne izleyeceğimi söylüyor" hissini verir;
Faz 3+4 onu rakiplerden ayrıştırır.

| Faz | Yaklaşım | Efor | Kişiselleştirme | Tek kullanıcıyla çalışır? |
| --- | --- | --- | --- | --- |
| 1 | TMDB `recommendations`/`similar` + keşif rayları | Düşük | Orta | Evet |
| 2 | Zevk profili + içerik-tabanlı skorlama | Orta | Yüksek | Evet |
| 3 | pgvector semantik benzerlik | Yüksek | Çok yüksek | Evet |
| 4 | Collaborative filtering | Yüksek | Çok yüksek | Hayır (kitle ister) |
| 5 | Doğal dilde keşif (LLM) | Orta-Yüksek | Yüksek | Evet |
