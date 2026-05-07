/**
 * Upload Service — upload de imagens para Supabase Storage
 * Usado para foto do motorista e CNH
 */
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Alert, Platform } from 'react-native';

export const UploadService = {
  /**
   * Solicita permissão e abre o seletor de imagem
   */
  async pickImage(): Promise<string | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para enviar a foto.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  },

  /**
   * Solicita permissão e abre a câmera
   */
  async takePhoto(): Promise<string | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar a foto.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  },

  /**
   * Upload de imagem para Supabase Storage
   * @param uri - URI local da imagem
   * @param bucket - nome do bucket no Supabase
   * @param path - caminho no bucket (ex: motoristas/userId/foto.jpg)
   */
  async uploadToSupabase(uri: string, bucket: string, path: string): Promise<{ url: string | null; error?: string }> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      // Converter blob para ArrayBuffer para o upload
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Erro no upload:', error);
        return { url: null, error: 'Erro ao enviar imagem. Tente novamente.' };
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return { url: urlData.publicUrl };
    } catch (err) {
      console.error('Erro inesperado no upload:', err);
      return { url: null, error: 'Erro inesperado ao enviar imagem.' };
    }
  },

  /**
   * Fluxo completo: pick + upload
   */
  async pickAndUpload(bucket: string, path: string): Promise<{ url: string | null; error?: string }> {
    const uri = await this.pickImage();
    if (!uri) return { url: null };
    return this.uploadToSupabase(uri, bucket, path);
  },
};
