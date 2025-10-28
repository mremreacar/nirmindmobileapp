# Dikte Feature

Bu feature, uygulama genelinde kullanılabilir dikte (ses tanıma) özelliklerini sağlar.

## Kullanım

### Temel Kullanım

```typescript
import { useDictation, useWaveAnimation } from '../features/dictation';

const MyComponent = () => {
  const { dictationState, toggleDictation } = useDictation({
    onTextUpdate: (text: string) => {
      // Gelen metni işle
      setInputText(prev => prev + text);
    },
    onError: (error: string) => {
      console.error('Dikte hatası:', error);
    },
    onStart: () => {
      console.log('Dikte başlatıldı');
    },
    onStop: () => {
      console.log('Dikte durduruldu');
    },
  });

  const { animations: waveAnimations } = useWaveAnimation(dictationState.isDictating);

  return (
    <View>
      <TextInput value={inputText} />
      <TouchableOpacity onPress={toggleDictation}>
        <Text>{dictationState.isDictating ? 'Durdur' : 'Başlat'}</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### DictationButton Component'i ile

```typescript
import { DictationButton, useDictation, useWaveAnimation } from '../features/dictation';

const MyComponent = () => {
  const { dictationState, toggleDictation } = useDictation({
    onTextUpdate: (text: string) => {
      setInputText(prev => prev + text);
    },
    onError: (error: string) => {
      console.error('Dikte hatası:', error);
    },
  });

  const { animations: waveAnimations } = useWaveAnimation(dictationState.isDictating);

  return (
    <DictationButton
      isDictating={dictationState.isDictating}
      onPress={toggleDictation}
      waveAnimations={waveAnimations}
    />
  );
};
```

## API

### useDictation Hook

#### Parametreler
- `callbacks`: DictationCallbacks
  - `onTextUpdate`: (text: string) => void - Tanınan metin geldiğinde çağrılır
  - `onError`: (error: string) => void - Hata oluştuğunda çağrılır
  - `onStart?`: () => void - Dikte başladığında çağrılır (opsiyonel)
  - `onStop?`: () => void - Dikte durduğunda çağrılır (opsiyonel)
- `config?`: DictationConfig (opsiyonel)
  - `language?`: string - Dil kodu (varsayılan: 'tr-TR')
  - `continuous?`: boolean - Sürekli dinleme (varsayılan: false)
  - `interimResults?`: boolean - Ara sonuçlar (varsayılan: true)

#### Dönen Değerler
- `dictationState`: DictationState
  - `isListening`: boolean - Dinleme durumu
  - `isDictating`: boolean - Dikte durumu
  - `currentMessage`: string - Mevcut mesaj
- `startDictation`: () => Promise<void> - Dikteyi başlat
- `stopDictation`: () => void - Dikteyi durdur
- `toggleDictation`: () => Promise<void> - Dikteyi aç/kapat
- `resetDictation`: () => void - Dikte durumunu sıfırla

### useWaveAnimation Hook

#### Parametreler
- `isActive`: boolean - Animasyonun aktif olup olmadığı

#### Dönen Değerler
- `animations`: Animated.Value[] - Wave animasyon değerleri
- `startAnimations`: () => Animated.CompositeAnimation[] - Animasyonları başlat
- `stopAnimations`: () => void - Animasyonları durdur
- `resetAnimations`: () => void - Animasyonları sıfırla

### DictationButton Component

#### Props
- `isDictating`: boolean - Dikte durumu
- `onPress`: () => void - Butona basıldığında çağrılacak fonksiyon
- `waveAnimations`: Animated.Value[] - Wave animasyon değerleri
- `style?`: any - Ek stil (opsiyonel)

## Özellikler

- ✅ Türkçe dil desteği
- ✅ Wave animasyonları
- ✅ Hata yönetimi
- ✅ TypeScript desteği
- ✅ Yeniden kullanılabilir component'ler
- ✅ Hook tabanlı yapı
- ✅ Modüler tasarım

