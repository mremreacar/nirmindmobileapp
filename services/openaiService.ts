import OpenAI from 'openai';
import * as FileSystem from 'expo-file-system/legacy';

// OpenAI API yapılandırması
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

export class OpenAIService {
  // Resim formatını tespit et
  private getImageMimeType(imageUri: string): string {
    const extension = imageUri.toLowerCase().split('.').pop();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'bmp':
        return 'image/bmp';
      default:
        return 'image/jpeg'; // Varsayılan olarak JPEG
    }
  }

  // Resmi base64 formatına çevir
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      console.log('🔄 Resim base64 formatına çevriliyor:', imageUri);
      
      // Legacy FileSystem API ile dosya bilgilerini kontrol et
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists) {
        throw new Error('Resim dosyası bulunamadı');
      }
      
      // Dosya boyutunu kontrol et (20MB limit)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (fileInfo.size && fileInfo.size > maxSize) {
        throw new Error('Resim çok büyük. Maksimum 20MB boyutunda resim yükleyebilirsiniz.');
      }
      
      // Resmi base64 formatına çevir
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });
      
      // Base64 verisini kontrol et
      if (!base64 || base64.length === 0) {
        throw new Error('Resim base64 formatına çevrilemedi');
      }
      
      console.log('✅ Resim base64 formatına çevrildi, uzunluk:', base64.length);
      return base64;
    } catch (error) {
      console.error('❌ Resim base64 çevirme hatası:', error);
      throw new Error('Resim base64 formatına çevrilemedi');
    }
  }

  // Metin mesajı için AI cevabı al
  async sendMessage(message: string, conversationId: string): Promise<ChatResponse> {
    try {
      console.log('🤖 AI mesajı işleniyor:', message.substring(0, 50) + '...');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Sen NirMind uygulamasının AI asistanısın. Türkçe konuşuyorsun ve kullanıcılara yardımcı oluyorsun.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9
      });

      const rawResponse = completion.choices[0]?.message?.content || 'Üzgünüm, bir cevap üretemedim.';
      const cleanResponse = this.cleanMarkdown(rawResponse);
      
      return {
        message: cleanResponse,
        success: true
      };

    } catch (error) {
      console.error('OpenAI API hatası:', error);
      return {
        message: 'Üzgünüm, şu anda bir hata oluştu. Lütfen tekrar deneyin.',
        success: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      };
    }
  }

  // Görsel analizi için AI cevabı al (ChatGPT gibi)
  async analyzeImage(imageUri: string, userQuestion?: string): Promise<ChatResponse> {
    try {
      console.log('🖼️ Görsel analiz ediliyor...');

      // Resmi base64 formatına çevir
      const base64Image = await this.convertImageToBase64(imageUri);
      
      // Base64 formatını kontrol et
      if (!base64Image || base64Image.length === 0) {
        throw new Error('Resim base64 formatına çevrilemedi');
      }
      
      // Resim formatını tespit et
      const mimeType = this.getImageMimeType(imageUri);
      console.log('📸 Base64 resim hazır, uzunluk:', base64Image.length, 'format:', mimeType);
      
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: 'Sen NirMind uygulamasının görsel analiz uzmanısın. Kullanıcıların yüklediği görselleri analiz eder ve detaylı açıklamalar yaparsın. Türkçe konuşuyorsun. Görseli dikkatlice incele ve kullanıcının sorusuna göre detaylı bir analiz yap.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userQuestion || 'Bu görseli analiz eder misin?'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9
      });

      const rawResponse = completion.choices[0]?.message?.content || 'Görsel analiz edilemedi.';
      const cleanResponse = this.cleanMarkdown(rawResponse);

      return {
        message: cleanResponse,
        success: true
      };

    } catch (error) {
      console.error('❌ Görsel analiz hatası:', error);
      
      // Özel hata mesajları
      let errorMessage = 'Görsel analiz edilemedi. Lütfen tekrar deneyin.';
      
      if (error instanceof Error) {
        if (error.message.includes('base64')) {
          errorMessage = 'Resim formatı desteklenmiyor. Lütfen JPEG, PNG veya WEBP formatında resim seçin.';
        } else if (error.message.includes('size')) {
          errorMessage = 'Resim çok büyük. Lütfen daha küçük bir resim seçin.';
        } else if (error.message.includes('network')) {
          errorMessage = 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.';
        } else if (error.message.includes('API')) {
          errorMessage = 'AI servisi geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
        }
      }
      
      return {
        message: errorMessage,
        success: false,
        error: error instanceof Error ? error.message : 'Görsel analiz hatası'
      };
    }
  }

  // Dosya analizi için AI cevabı al
  async analyzeFile(fileUri: string, fileName: string, userQuestion?: string): Promise<ChatResponse> {
    try {
      console.log('📄 Dosya analiz ediliyor:', fileName);

      // Dosya içeriğini oku
      const fileContent = await this.readFileContent(fileUri, fileName);
      const fileExtension = fileName.toLowerCase().split('.').pop();
      
      let contentToAnalyze = '';
      
      if (fileContent) {
        contentToAnalyze = `\n\nDosya İçeriği:\n${fileContent}`;
      } else {
        contentToAnalyze = '\n\nNot: Dosya içeriği okunamadı. Sadece dosya bilgisi mevcut.';
      }

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: 'Sen NirMind uygulamasının dosya analiz uzmanısın. Kullanıcıların yüklediği dosyaları analiz eder ve detaylı açıklamalar yaparsın. Türkçe konuşuyorsun.'
        },
        {
          role: 'user',
          content: `Dosya: ${fileName} (${fileExtension} formatında)\n\nKullanıcı Sorusu: ${userQuestion || 'Bu dosyayı analiz eder misin?'}${contentToAnalyze}`
        }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9
      });

      const rawResponse = completion.choices[0]?.message?.content || 'Dosya analiz edilemedi.';
      const cleanResponse = this.cleanMarkdown(rawResponse);
      
      return {
        message: cleanResponse,
        success: true
      };

    } catch (error) {
      console.error('Dosya analiz hatası:', error);
      return {
        message: 'Dosya analiz edilemedi. Lütfen tekrar deneyin.',
        success: false,
        error: error instanceof Error ? error.message : 'Dosya analiz hatası'
      };
    }
  }

  // Dosya içeriğini oku
  private async readFileContent(fileUri: string, fileName: string): Promise<string | null> {
    try {
      console.log('📖 Dosya okunuyor:', fileName);
      
      const FileSystem = require('expo-file-system/legacy');
      const fileExtension = fileName.toLowerCase().split('.').pop();
      
      // Text dosyaları için
      if (['txt', 'md', 'json', 'xml', 'csv', 'log', 'rtf'].includes(fileExtension || '')) {
        const content = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'utf8',
        });
        console.log('✅ Text dosyası okundu, uzunluk:', content.length);
        return content;
      }
      
      // DOCX dosyaları için özel işlem
      if (fileExtension === 'docx') {
        return await this.convertDocxToText(fileUri, fileName);
      }
      
      // DOC dosyaları için özel işlem
      if (fileExtension === 'doc') {
        return await this.convertDocToText(fileUri, fileName);
      }
      
      // PDF dosyaları için özel işlem
      if (fileExtension === 'pdf') {
        return await this.convertPdfToText(fileUri, fileName);
      }
      
      // Excel dosyaları için özel işlem
      if (['xlsx', 'xls'].includes(fileExtension || '')) {
        return await this.convertExcelToText(fileUri, fileName);
      }
      
      // PowerPoint dosyaları için özel işlem
      if (['pptx', 'ppt'].includes(fileExtension || '')) {
        return await this.convertPowerPointToText(fileUri, fileName);
      }
      
      // Diğer dosya türleri için bilgi döndür
      console.log('⚠️ Desteklenmeyen dosya türü:', fileExtension);
      return `Dosya türü: ${fileExtension}. Bu dosya türü için içerik okuma desteklenmiyor.`;
      
    } catch (error) {
      console.error('❌ Dosya okuma hatası:', error);
      return null;
    }
  }

  // DOCX dosyasını text'e çevir
  private async convertDocxToText(fileUri: string, fileName: string): Promise<string> {
    try {
      console.log('📄 DOCX dosyası text formatına çevriliyor...');
      
      // Basit DOCX içerik çıkarma (ZIP tabanlı)
      const FileSystem = require('expo-file-system/legacy');
      const base64Content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });
      
      // Base64'ü decode et ve ZIP içeriğini analiz et
      const extractedText = this.extractTextFromDocx(base64Content);
      
      if (extractedText) {
        console.log('✅ DOCX içeriği çıkarıldı, uzunluk:', extractedText.length);
        return `DOCX Belgesi: ${fileName}\n\nİçerik:\n${extractedText}`;
      } else {
        return `DOCX Belgesi: ${fileName}\n\nNot: Bu DOCX dosyasının içeriği çıkarılamadı. Dosyayı Word'de açıp metin olarak kopyalayarak analiz edebilirsiniz.`;
      }
      
    } catch (error) {
      console.error('❌ DOCX çevirme hatası:', error);
      return `DOCX Belgesi: ${fileName}\n\nHata: Dosya içeriği okunamadı. Lütfen dosyayı Word'de açıp metin olarak kopyalayın.`;
    }
  }

  // DOC dosyasını text'e çevir
  private async convertDocToText(fileUri: string, fileName: string): Promise<string> {
    console.log('📄 DOC dosyası tespit edildi:', fileName);
    return `DOC Belgesi: ${fileName}\n\nNot: Eski DOC formatındaki dosyalar için içerik çıkarma desteklenmiyor. Lütfen dosyayı Word'de açıp DOCX formatına çevirin veya metni kopyalayın.`;
  }

  // PDF dosyasını text'e çevir
  private async convertPdfToText(fileUri: string, fileName: string): Promise<string> {
    console.log('📄 PDF dosyası tespit edildi:', fileName);
    return `PDF Belgesi: ${fileName}\n\nNot: PDF dosyaları için metin çıkarma özelliği yakında eklenecek. Şu anda sadece dosya bilgisi görüntülenebiliyor.`;
  }

  // Excel dosyasını text'e çevir
  private async convertExcelToText(fileUri: string, fileName: string): Promise<string> {
    console.log('📊 Excel dosyası tespit edildi:', fileName);
    return `Excel Belgesi: ${fileName}\n\nNot: Excel dosyaları için içerik çıkarma özelliği yakında eklenecek. Şu anda sadece dosya bilgisi görüntülenebiliyor.`;
  }

  // PowerPoint dosyasını text'e çevir
  private async convertPowerPointToText(fileUri: string, fileName: string): Promise<string> {
    console.log('📋 PowerPoint dosyası tespit edildi:', fileName);
    return `PowerPoint Belgesi: ${fileName}\n\nNot: PowerPoint dosyaları için içerik çıkarma özelliği yakında eklenecek. Şu anda sadece dosya bilgisi görüntülenebiliyor.`;
  }

  // DOCX içeriğinden text çıkarma
  private extractTextFromDocx(base64Content: string): string | null {
    try {
      // Basit DOCX text extraction (ZIP içeriğinden)
      // DOCX dosyaları aslında ZIP arşivleridir
      
      // Base64'ü binary string'e çevir
      const binaryString = this.base64ToBinary(base64Content);
      
      // ZIP header'ını kontrol et
      if (!binaryString.startsWith('PK')) {
        console.log('⚠️ Geçerli ZIP dosyası değil');
        return null;
      }
      
      // Basit text extraction
      const textMatches = binaryString.match(/[a-zA-Z0-9\s\.\,\!\?\:\;\(\)\-\"\']{50,}/g);
      
      if (textMatches && textMatches.length > 0) {
        // En uzun text match'i al
        const longestMatch = textMatches.reduce((a, b) => a.length > b.length ? a : b);
        
        // Çok kısa ise birkaç match'i birleştir
        if (longestMatch.length < 100 && textMatches.length > 1) {
          const combinedText = textMatches.slice(0, 3).join(' ').trim();
          return combinedText.length > longestMatch.length ? combinedText : longestMatch;
        }
        
        return longestMatch.trim();
      }
      
      return null;
      
    } catch (error) {
      console.error('DOCX text extraction hatası:', error);
      return null;
    }
  }

  // Base64'ü binary string'e çevir
  private base64ToBinary(base64: string): string {
    try {
      // React Native için basit base64 decode
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      
      for (let i = 0; i < base64.length; i += 4) {
        const encoded = base64.slice(i, i + 4);
        const decoded = (chars.indexOf(encoded[0]) << 18) | 
                       (chars.indexOf(encoded[1]) << 12) | 
                       (chars.indexOf(encoded[2]) << 6) | 
                       chars.indexOf(encoded[3]);
        
        result += String.fromCharCode((decoded >> 16) & 255);
        if (encoded[2] !== '=') result += String.fromCharCode((decoded >> 8) & 255);
        if (encoded[3] !== '=') result += String.fromCharCode(decoded & 255);
      }
      
      return result;
    } catch (error) {
      console.error('Base64 decode hatası:', error);
      return '';
    }
  }


  // Markdown temizleme
  private cleanMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')           // **bold** → bold
      .replace(/\*(.*?)\*/g, '$1')               // *italic* → italic
      .replace(/`(.*?)`/g, '$1')                 // `code` → code
      .replace(/#{1,6}\s/g, '')                  // # headers → remove
      .replace(/~~(.*?)~~/g, '$1')               // ~~strikethrough~~ → strikethrough
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')        // [text](url) → text
      .replace(/^[-*+]\s/gm, '')                 // bullet points → remove
      .replace(/^\d+\.\s/gm, '')                 // numbered lists → remove
      .replace(/\n{3,}/g, '\n\n')                // multiple newlines → double newline
      .trim();
  }
}

export const openaiService = new OpenAIService();