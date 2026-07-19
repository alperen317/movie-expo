# Öneri & Keşif Motoru — Planı

Bu belge, _Previously_ uygulamasına kişiselleştirilmiş bir öneri/keşif motoru
eklemek için aşamalı bir yol haritasıdır. Fazlar bağımsız olarak
yayınlanabilir; her faz tek başına değer üretir.

> **Revizyon (2026-07):** Plan, kod tabanındaki gelişmelere göre güncellendi.
> Faz 2'nin şema-zenginleştirme adımı `0019_multi_genre_storage.sql` ile
> büyük ölçüde tamamlandı; paylaşımlı liste altyapısının olgunlaşması
> (izlenme özeti RPC'si, anketler, davet e-postaları) Faz 4'ün ara ürününü
> öne çekilebilir bir hızlı kazanca dönüştürdü. Ayrıntılar ilgili fazlarda.

## Bağlam ve Kısıtlar

Plan, mevcut kod tabanına dayanır:

- **Katmanlı mimari** korunur: hesaplama `lib/` içinde saf (test edilebilir)
  fonksiyonlar, durum `stores/` içinde Zustand store'ları, ekranlar yalnızca
  store'lardan okur.
- **TMDB istemcisi** (`lib/tmdb/`) ve `mediaMetadataCache.ts` zenginleştirme
  altyapısının temelini sağlar.
- Ana ekran bileşenleri (`HeroCarousel`, `MediaRow`, `ContinueWatchingRow`)
  satır-tabanlıdır; öneri rayları buraya doğal oturur.

### Plana Etki Eden Tespitler (güncel)

1. **Tür verisi artık çoklu tutuluyor — bu iş bitti.**
   `0019_multi_genre_storage.sql`, `watch_log` / `saved_media` / `list_items`
   tablolarındaki tek `genre text` kolonunu `genres text[]` ile değiştirdi ve
   mevcut satırları backfill etti. Faz 2'nin planladığı migration'a artık
   gerek yok; tür-tabanlı skorlama doğrudan bu kolonla çalışır.
   - **Kalan boşluk:** Kolon TMDB genre _id_'si değil, `TMDB_GENRE_MAP`'ten
     çözülmüş _isim_ tutar. Tür skorlaması için yeterli; ancak TMDB `discover`
     çağrılarına `with_genres` parametresi geçerken isim → id çevirisi
     gerekir (harita `lib/tmdb/genres.ts`'te zaten mevcut, ters çeviri
     önemsiz).
   - **Hâlâ eksik sinyaller:** Oyuncu/yönetmen ve keyword verisi hiçbir
     tabloda yok. Faz 2 bunları kalıcı şemaya eklemek yerine skorlama anında
     `mediaMetadataCache` üzerinden TMDB'den çeker (aşağıda).
2. **Kullanıcılar-arası veri RLS'e takılır.** Collaborative filtering "başka
   kullanıcılar ne izledi" verisine bakar, ama RLS her kullanıcıyı kendi
   satırlarına kilitler (doğru davranış). Bu yüzden Faz 4, ham veriyi açmadan
   anonim/agregat bir katman kullanır. Bu desenin canlı bir örneği artık
   üretimde: `get_list_watch_summary` RPC'si (`0017_list_watch_summary.sql`)
   `SECURITY DEFINER` ile yalnızca agregat sayı döndürür, bireysel satır
   sızdırmaz — Faz 4'ün RPC'leri aynı kalıbı kopyalar.

---

## Faz 1 — Temel: TMDB Öneri Uçları + Keşif Rayları

**Efor:** ~1-2 gün · **Kişiselleştirme:** Orta · **Cold-start çözümü:** Evet

Motorun fallback katmanı; sonraki fazlar boşsa bile ekran dolu kalır.

- `lib/tmdb/`'ye `fetchRecommendations(mediaType, id)` ve `fetchSimilar` eklenir.
- Detay ekranına (`app/(app)/details/[id].tsx`) "Benzer içerikler" satırı.
- Ana ekrana `top_rated`, `upcoming` ve türe göre keşif satırları.
- Hiç izleme geçmişi olmayan yeni kullanıcı bu rayları görür (cold start).

## Faz 1.5 — Hızlı Kazanç: "Liste Arkadaşlarının İzledikleri" _(yeni)_

**Efor:** ~1 gün · Altyapısı büyük ölçüde hazır.

Planın ilk sürümünde Faz 4'ün içinde bir ara üründü; paylaşımlı liste
altyapısı olgunlaştığı için öne çekildi:

- `get_list_watch_summary` RPC'si zaten üretimde ve
  `lib/supabase/sharedLists.ts` üzerinden istemciye bağlı.
- Yapılacak tek iş: kullanıcının üye olduğu listelerdeki izlenme özetlerini
  toplayıp ana ekranda _"Liste arkadaşlarının izledikleri"_ `MediaRow`'una
  dönüştürmek (izleyenin kendisinin izledikleri elenir).
- Sosyal sinyalin ilk görünür hali; Faz 4'ün kitle gereksinimi olmadan
  bugünkü kullanıcı sayısıyla çalışır.

## Faz 2 — Zevk Profili + İçerik-Tabanlı Skorlama

**Efor:** ~2-4 gün (şema işi bittiği için kısaldı) · **Kişiselleştirme:**
Yüksek · Tamamen istemci tarafında.

Kendi algoritmanın ilk versiyonu:

- ~~Şema zenginleştirme: `watch_log`'a çoklu-tür migration'ı~~ — **tamamlandı**
  (`0019_multi_genre_storage.sql`, `genres text[]` + backfill). Tekrar
  yapılmayacak.
- `lib/recommendations/tasteProfile.ts`: izleme + rating verisinden ağırlıklı
  profil çıkarır — tür ağırlıkları `genres text[]` kolonundan (rating 8+
  izleme ×2 sayılır, düşük rating negatif sinyal), yayın on yılı tercihi,
  film/dizi oranı.
- **Oyuncu/yönetmen sinyali:** Kalıcı şemaya kolon eklemek yerine, skorlama
  sırasında kullanıcının en yüksek puanladığı ~20 başlığın credits verisi
  `mediaMetadataCache` üzerinden çekilip profile katılır. Böylece migration
  ve backfill maliyeti olmadan _"Christopher Nolan izlediğiniz için"_ satırı
  mümkün olur; ileride gerekirse kalıcılaştırılır.
- `lib/recommendations/score.ts`: TMDB `discover` uçlarından aday havuzu
  çekilir (tür isimleri `lib/tmdb/genres.ts` haritasıyla id'ye çevrilir),
  her aday profile göre skorlanır, **izlenmişler ve watchlist'tekiler
  elenir**, çeşitlilik için tür başına üst sınır uygulanır.
- Ana ekranda kişisel satırlar: _"Bilim-kurgu sevginize göre"_,
  _"Christopher Nolan izlediğiniz için"_, _"90'lar filmleri sizin işiniz"_.
- Hesap `lib/recommendations/` içinde saf fonksiyonlar (jest ile test edilir),
  durum `stores/recommendations.store.ts`'te tutulur.

## Faz 3 — pgvector ile Semantik Benzerlik

**Efor:** ~1 hafta · "Gerçek" motor buradan başlar.

- Supabase'de `pgvector` extension + `media_embeddings` tablosu
  (media_id, media_type, embedding).
- Bir Edge Function (mevcut `send-auth-email` / `send-list-invite-email`
  gibi) film/dizinin özet + tür + keyword metnini embedding'e çevirir ve
  cache'ler. Her başlık **bir kez** hesaplanır, tüm kullanıcılar paylaşır —
  maliyet düşük.
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
  için elenir. Gizlilik-koruyan agregat RPC kalıbı `get_list_watch_summary`
  ile kanıtlandı; buradaki fonksiyonlar aynı şablonu izler.
- Anket sonuçları (`0018_replace_item_voting_with_polls.sql`) ek bir beğeni
  sinyalidir: bir başlığın anketlerde ne sıklıkla kazandığı, rating'in
  bulunmadığı durumda zayıf-pozitif sinyal olarak co-occurrence matrisine
  katılabilir.
- **Dürüst not:** Bu faz ancak birkaç yüz aktif kullanıcıyla anlamlı sinyal
  üretir; o yüzden en sona kondu. Faz 1.5+2+3 tek kullanıcıyla bile çalışır.

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
- **i18n & erişilebilirlik:** Öneri satırı başlıkları (_"…sevginize göre"_)
  dinamik metinlerdir; en/tr locale dosyalarına interpolasyonlu anahtar
  olarak eklenir. Yeni kartlar/butonlar mevcut `a11y.*` etiket düzenini
  izler.

## Önerilen Sıra

Faz 1 → 1.5 → 2 ardışık yapılıp yayınlanır; Faz 3 kullanıcı tepkisine göre
eklenir. Faz 1+2 tek başına "uygulama bana ne izleyeceğimi söylüyor" hissini
verir; Faz 1.5 sosyal katmanı erkenden görünür kılar; Faz 3+4 ürünü
rakiplerden ayrıştırır.

| Faz | Yaklaşım                                          | Efor        | Kişiselleştirme | Tek kullanıcıyla çalışır? |
| --- | ------------------------------------------------- | ----------- | --------------- | ------------------------- |
| 1   | TMDB `recommendations`/`similar` + keşif rayları  | Düşük       | Orta            | Evet                      |
| 1.5 | Liste arkadaşlarının izledikleri satırı           | Çok düşük   | — (sosyal)      | Liste üyeliğiyle          |
| 2   | Zevk profili + içerik-tabanlı skorlama            | Orta        | Yüksek          | Evet                      |
| 3   | pgvector semantik benzerlik                       | Yüksek      | Çok yüksek      | Evet                      |
| 4   | Collaborative filtering                           | Yüksek      | Çok yüksek      | Hayır (kitle ister)       |
| 5   | Doğal dilde keşif (LLM)                           | Orta-Yüksek | Yüksek          | Evet                      |
