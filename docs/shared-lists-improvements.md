# Paylaşımlı Listeler — Geliştirme Önerileri

Bu belge, mevcut paylaşımlı liste özelliğinin (`lists`, `list_members`,
`list_items` + gerçek zamanlı senkronizasyon) koda dayalı bir incelemesinden
çıkan, önceliklendirilmiş geliştirme önerilerini içerir. Kapsam yalnızca
paylaşımlı listelerdir.

## Bağlam

İncelenen dosyalar: `supabase/migrations/0003_shared_lists.sql`,
`supabase/migrations/0009_list_join_code.sql`,
`supabase/migrations/0012_join_code_rate_limit.sql`,
`lib/supabase/sharedLists.ts`, `stores/sharedLists.store.ts`,
`app/(app)/lists/[id].tsx`, `app/(app)/(tabs)/lists.tsx`,
`components/lists/*`.

Mevcut mimari zaten olgun: `SECURITY DEFINER` fonksiyonlarıyla RLS
recursion'dan kaçınılmış, sütun-seviyesi privilege escalation'a karşı
trigger'lar var (`prevent_list_reassignment`,
`prevent_list_member_tampering`), realtime DELETE payload'ları için
`REPLICA IDENTITY FULL` uygulanmış, ve join-code brute-force'una karşı
rate limiting var (`0012_join_code_rate_limit.sql`). Aşağıdaki öneriler bu
temelin üzerine inşa edilir.

---

## 🔴 Güvenlik — öncelikli

### E-posta enumeration açığı: `invite_to_list`

`0003_shared_lists.sql`'deki `invite_to_list` RPC'si (satır 255-287) üç
farklı sonuç döndürür:

- `user_not_found` — bu e-postayla kayıtlı hesap yok
- `already_invited_or_member` — hesap var, zaten davetli/üye
- başarı — hesap var, davet gönderildi

Bir saldırgan, kendi sahip olduğu bir listeye rastgele e-postalar davet
ederek bu üç yanıtı ayırt edip **hangi e-postaların platformda kayıtlı
olduğunu** tespit edebilir. `join_list_by_code` için zaten uygulanan
rate-limiting deseni (`0012_join_code_rate_limit.sql`) bu RPC'de yok —
üstelik enumeration'ın rate limiting'den bağımsız bir bilgi sızıntısı
olduğu unutulmamalı.

**Öneri:**

- `invite_to_list`'e de `join_code_attempts` tablosundaki gibi bir
  rolling-window rate limit eklemek (kaba kuvvetle e-posta taramasını
  yavaşlatır, ama enumeration'ın kendisini çözmez).
- Asıl çözüm: `user_not_found` durumunda da bir davet satırı üretmek
  (örneğin `list_members.user_id`'yi nullable yapıp e-posta bazlı bekleyen
  bir davet modeline geçmek, kullanıcı sonradan kayıt olduğunda eşleşecek
  şekilde) veya en azından her üç durumda da istemciye aynı jenerik mesajı
  döndürüp ayrımı ortadan kaldırmak.

---

## 🟡 Orta öncelik — düşük efor, yüksek ürün değeri

### 1. Davet için proaktif bildirim yok

Bir kullanıcı davet edildiğinde bunu öğrenmenin tek yolu Listeler
sekmesini açıp "Pending Invites" kartını görmektir
(`app/(app)/(tabs)/lists.tsx:121-144`). `lib/notifications/` içinde
yalnızca bölüm hatırlatıcıları var (`episodeReminders.ts`); `invite_to_list`
çağrıldığında hiçbir push/e-posta tetiklenmiyor. `send-auth-email` Edge
Function'ı da yalnızca auth e-postalarını (signup/reset) kapsıyor.

**Öneri:** `invite_to_list` sonrası Brevo üzerinden basit bir "X sizi Y
listesine davet etti" e-postası + Listeler sekmesi ikonuna bekleyen davet
sayısını gösteren bir rozet (`FloatingTabBar`'da şu an hiçbir rozet mantığı
yok).

### 2. Öğeye kim/ne zaman eklediği UI'de hiç gösterilmiyor

`SharedListItem.addedBy` ve `addedAt` alanları çekiliyor
(`lib/supabase/sharedLists.ts:19-25`) ama `ListItemCard` bunları render
etmiyor. Paylaşımlı bir listede "bunu kim önerdi" sosyal bağlamın önemli
bir parçası.

**Öneri:** Kart üzerine ekleyen kişinin küçük bir avatarı/adı (mevcut
`MemberAvatarRow` deseninden faydalanılabilir) veya "Ayşe ekledi · 2 saat
önce" alt metni.

### 3. Uygulama arka plandan öne gelince realtime yeniden senkronize olmuyor

`openList`/`closeList` yalnızca ekran mount/unmount olduğunda çalışır
(`app/(app)/lists/[id].tsx:59-63`). Root layout'taki `AppState` dinleyicisi
yalnızca Supabase auth token yenilemeyi tetikliyor (`app/_layout.tsx`),
realtime kanalını değil. Mobilde WebSocket arka planda kolayca kopar —
kullanıcı liste ekranını açık bırakıp uygulamaya geri dönerse, ekrandan
çıkıp tekrar girene kadar diğer üyelerin değişikliklerini görmeyebilir.

**Öneri:** `AppState.addEventListener('change', ...)` içinde uygulama
`active` olduğunda, açık bir `activeListId` varsa `openList`'i sessizce
yeniden çağırıp store'u tazelemek.

---

## 🟢 Daha büyük yatırımlar

### 4. "Kaçınız izledi?" bilgisi yok

Paylaşımlı bir listenin en doğal ihtiyacı: "bu filmi grubun kaçı zaten
izlemiş" göstermek. `watch_log` kişisel veri olduğu için (RLS ile her
kullanıcıyı kendi satırlarına kilitliyor), bu README'de belgelenen
`SECURITY DEFINER` deseniyle aynı yaklaşımla — liste üyelerinin
`watch_log` durumunu anonim/agregat şekilde açan yeni bir RPC gerektirir
(ör. `get_list_watch_summary(list_id)` → her öğe için izleyen üye sayısı).

### 5. Sıralama / filtreleme yok

`fetchListItems` her zaman `created_at desc` sırasıyla döner
(`lib/supabase/sharedLists.ts:313-324`). Büyüyen bir listede türe, puana
veya "kim ekledi"ye göre filtreleme/sıralama imkanı yok.

### 6. "Ne izleyeceğiz?" karar mekanizması yok

Paylaşımlı liste + basit bir oylama sistemi ("bu akşam ne izleyelim"
tartışmasını çözen bir özellik) eklenebilir. Küçük bir
`list_item_votes` tablosu (list_item_id, user_id, unique constraint) ve
öğe başına toplam oy sayacı yeterli olur; mevcut realtime altyapısı
(`subscribeToList`) oy değişikliklerini de aynı kanaldan yayabilir.

---

## Önerilen sıra

1. **Güvenlik açığı** (enumeration) — küçük, izole, öncelikli.
2. **Realtime resync** (#3) — küçük bir `AppState` düzeltmesi, sessiz veri
   kaybını önler.
3. **Ekleyen kişi gösterimi** (#2) — zaten çekilen veriyi UI'ye taşımak,
   şema değişikliği gerektirmiyor.
4. **Davet bildirimi** (#1) — orta efor, davet kabul oranını doğrudan
   etkiler.
5. **İzleme özeti** (#4) ve **oylama** (#6) — yeni şema + RPC gerektiren,
   daha büyük özellikler; kullanıcı geri bildirimine göre önceliklendirilir.
