# movie-expo — Geliştirme Planı v2

*Temmuz 2026 · `GELISTIRMEPLANI.md`'nin (v1) devamı. v1'in Faz 1–4 kalemleri büyük ölçüde tamamlandı; bu doküman v1'de açık kalan işleri, kod tabanı incelemesinde tespit edilen mühendislik eksiklerini ve mağaza/yayın hazırlığını tek bir yol haritasında birleştirir. Tamamlanan işlerin kaydı v1'de kalır; bu doküman yalnızca açık işleri izler.*

## Hedef

Uygulamayı **profesyonel, yayınlanabilir ve sürdürülebilir** seviyeye taşımak: mağazada yayında, belgelenmiş, CI ile korunan, dışarıdan bakan birinin (kullanıcı, katkıcı veya kod inceleyen) beş dakikada anlayıp değerlendirebileceği bir ürün.

---

## Faz A — Ürün Kimliği ve Zorunluluklar *(yarım gün · v1 Faz 0 devri)*

Küçük ama her şeyi etkileyen, ertelenmişliği en pahalı kalemler:

- [x] **Ürün adı**: **Previously** — "Previously on…" jenerik kalıbından; mağaza/marka taraması yapıldı (kategoride çakışma yok). `app.json` name/slug/scheme (`previously`) + bundle id (`com.alperen317.previously`) tek commit'te güncellendi. Mağaza kaydından önce App Store Connect/Play Console isim rezervasyonu ve `previously.app` domain kontrolü yapılmalı.
- [x] **TMDB atfı**: zorunlu metin + themoviedb.org linki Profil ekranının altına eklendi (JustWatch atfı detay ekranında zaten mevcuttu). *Kalan tek satırlık iş: resmi TMDB logosu ([brand sayfasından](https://www.themoviedb.org/about/logos-attribution)) `assets/`'e eklenip metnin yanına konmalı — geliştirme ortamının ağ kısıtı nedeniyle indirilemedi.*
- [x] **Sürüm modeli kararının kaydı**: v1 tamamen ücretsiz; ücretli katman değerlendirmesi Faz G'de, kullanım verisi görüldükten sonra. Karar burada kayıt altında — v1 kapsamında tekrar tartışılmaz.

**Kabul ölçütü:** Uygulama gerçek adıyla derleniyor, auth redirect'leri yeni scheme ile çalışıyor, atıf ekranı mevcut.

## Faz B — Mühendislik Hijyeni *(1–2 gün)*

Kod incelemesinde tespit edilen, düşük maliyet / yüksek getiri kalemler:

- [ ] **README.md (İngilizce)**: ekran görüntüleri/kısa GIF, tek paragraf ürün tanımı, mimari özeti (katmanlar: `lib/tmdb` → `lib/supabase` → `stores` → `app`), kurulum adımları (env değişkenleri, Supabase migration'larının uygulanması), teknoloji listesi.
- [ ] **README "Design Decisions" bölümü**: öne çıkan teknik kararların kısa anlatımı — RLS yetki-yükseltme trigger'ları (`0003_shared_lists.sql`), realtime WAL DELETE payload eşleştirmesi, TV Time export'unun başlık+yıl bazlı TMDB eşleştirmesi (export'ta harici id bulunmaması nedeniyle).
- [ ] **CI**: GitHub Actions workflow — `tsc --noEmit` + `jest`, PR ve master push'ta. README'ye durum rozeti.
- [ ] **ESLint + Prettier**: yapılandırma + mevcut kodun tek seferlik formatlanması + CI'a lint adımı.
- [ ] **Importer sağlamlığı**: `lib/importers/tvtime.ts` — beklenen CSV kolonları eksikse (`row.series_name`, `row.movie_name` undefined) `.trim()` çağrıları TypeError fırlatıyor; varyant export dosyalarına karşı `?? ''` koruması + eksik-kolon durumu için test.
- [ ] **Bildirim izni zamanlaması**: `scheduleUpcomingEpisodeReminders` izni uygulama açılışında istiyor; bağlamsız izin isteği reddedilme oranını artırır. İzin isteği ilk bağlamlı ana taşınmalı (ilk dizi takibi veya takvim ekranı ziyareti), açılışta yalnızca izin zaten verilmişse planlama yapılmalı.

**Kabul ölçütü:** Repoyu ilk kez gören biri README ile 5 dakikada projeyi anlıyor; her PR'da tip + test + lint otomatik çalışıyor.

## Faz C — v1 Kapsam Tamamlama *(~1 hafta · v1'den devreden ürün işleri)*

- [ ] **Toplu bölüm işaretleme** *(v1 Faz 1b'nin açık kalemi — çekirdek kabul ölçütünün parçası)*: sezon başlığında "buraya kadar işaretle" (upsert batch). v1 hedefi geçerli: 3 sezon ≤ 30 saniyede işaretlenebilmeli.
- [ ] **İzleme bölgesi ayarı** *(v1 Faz 3'ün ertelenen kalemi)*: "Nerede izlenir?" bölgesi cihaz locale'inden geliyor; ayarlardan değiştirilebilir olmalı (yurt dışı katalog takip eden kullanıcılar için).
- [ ] **`details/[id].tsx` refaktörü** *(bakım kalemi)*: 538 satırlık ekrandan galeri görüntüleyici ve fragman modal'ının ayrı bileşenlere çıkarılması. Davranış değişikliği yok.
- [ ] **Hafif ilk-açılış yönlendirmesi** *(v1 Faz 2'de kapsam dışı bırakılmıştı, hafifletilmiş haliyle geri alınıyor)*: tam onboarding akışı yerine, boş ana ekranda "TV Time / Letterboxd verini içe aktar" çağrısı — import özelliğinin keşfedilebilirliği yalnızca Profil ekranına bağlı kalmamalı.

## Faz D — Mağaza Hazırlığı *(~1 hafta · v1 Faz 6 devri, gelir kalemi hariç)*

- [ ] İkon / splash / adaptive icon (mevcut şablon görselleri ürün kimliğiyle değiştirilecek).
- [ ] **EAS yapılandırması**: `eas.json` profilleri (development / preview / production).
- [ ] **Gizlilik politikası + kullanım koşulları** sayfaları ve uygulama içi linkleri.
- [ ] **Hesap silme akışı**: Apple 5.1.1(v) zorunluluğu — `delete_account()` RPC + onaylı UI akışı.
- [ ] **Sentry + temel analitik** (opt-out'lu).
- [ ] **`join_list_by_code` hız sınırı**: kod alanı brute-force'a karşı pratikte güvenli (32⁸ kombinasyon) ancak RPC'de hız sınırı yok; yayın öncesi Supabase tarafında rate limit değerlendirilmeli.
- [ ] **Mağaza metadata + ASO**: açıklama, anahtar kelimeler ("TV Time alternatifi" dahil), ekran görüntüleri.
- [ ] **Yayın sırası**: Google Play önce (tek seferlik kayıt, kapalı test şartı: 12 testçi / 14 gün — takvime dahil edilmeli), App Store ardından.

**Kabul ölçütü:** Uygulama en az bir mağazada kapalı testte; gizlilik/hesap silme gereksinimleri karşılanmış.

## Faz E — Demo ve Görünürlük *(2–3 gün · Faz B–D ile paralel yürütülebilir)*

- [ ] **Web demo**: mevcut react-native-web desteğiyle ücretsiz hosting'e deploy; README'ye canlı demo linki. (Alternatif/ek: README'ye 30–60 sn ekran kaydı.)
- [ ] **Teknik yazı**: "Design Decisions" bölümünün genişletilmiş hali tek bir blog yazısı olarak (RLS tasarımı veya TV Time import tersine mühendisliği) — projenin dışarıdan keşfedilebilirliği için.

## Faz F — Sosyal Katman *(~2 hafta · v1 Faz 5, v1.1 kapsamı)*

Mevcut paylaşımlı liste altyapısının üstüne — sıralama v1'deki gerekçeyle korunuyor (önce küçük-grup değeri, feed en sona):

- [ ] **Spoiler-korumalı bölüm yorumları**: `episode_comments` tablosu; yorum yalnızca o bölümü işaretlemiş kullanıcıya açık gösterilir (istemci blur + "spoiler'ı göster").
- [ ] **"Bu akşam ne izleyelim?"**: paylaşımlı listeden rastgele/oylamayla ortak seçim — mevcut realtime altyapısıyla düşük maliyetli.
- [ ] Profil takibi + basit aktivite akışı.

## Faz G — Gelir Katmanı *(karar kapısına bağlı · v1 Faz 6'nın gelir kalemi)*

Bu faz takvime değil **koşula** bağlıdır: anlamlı bir aktif kullanıcı tabanı ve tekrar kullanım (retention) sinyali görülmeden başlatılmaz.

- [ ] Pro katmanı (RevenueCat): gelişmiş istatistik ve konfor özellikleri.
- [ ] **Tasarım ilkesi**: büyüme mekanizması olan paylaşımlı liste/davet akışları ücretsiz katmanda kalır; ücretlendirme yalnızca derinlik/konfor özelliklerine uygulanır.
- [ ] Reklam **yok** (v1 kararının devamı — konumlandırmanın parçası).

---

## Sıralama Gerekçesi ve Riskler

| Risk | Etki | Önlem |
|---|---|---|
| İsim/scheme değişikliği geciktikçe maliyeti büyür | Derin link, auth redirect ve mağaza kaydı yeniden işlenir | Faz A her şeyden önce, tek commit'te |
| Mağaza inceleme reddi (gizlilik / hesap silme) | Yayın gecikir | Faz D'de Apple 5.1.1(v) ve veri güvenliği formları baştan planlı |
| Google Play kapalı test şartı (12 testçi / 14 gün) | Android yayını en az 2 hafta sürer | Test grubunu Faz D başında toplamaya başla |
| Varyant TV Time export dosyaları parser'ı kırar | İçe aktarma çöker, ilk izlenim zedelenir | Faz B'deki sağlamlık düzeltmesi + eksik-kolon testleri |
| Refaktör/lint dalgası davranış bozar | Regresyon | Önce CI (Faz B sırası: CI → lint → refaktör); refaktörler davranış-değişikliksiz |

**Kaba tahmin:** Faz A+B ≈ 2–3 gün; Faz C+D ≈ 2 hafta; Faz E paralel. Yayın hedefi bu tempoyla ~3 hafta. Faz F ve G yayın sonrası, kullanım sinyaline göre.
