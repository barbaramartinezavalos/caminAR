import { Alert } from 'react-native';

// Clave API de ImgBB (considera moverla a variables de entorno si es posible)
const IMG_BB_API_KEY = 'fe710239ec2669c60deafe46f166c86d';

/**
 * Sube una imagen a ImgBB.
 * @param uri La URI local del archivo de imagen (ej. de ImagePicker).
 * @returns La URL de la imagen subida en ImgBB o null si falla.
 */
export const uploadImage = async (uri: string): Promise<string | null> => {
  console.log('[uploadImage] Iniciando subida a ImgBB para:', uri);
  const formData = new FormData();
  const fileType = uri.split('.').pop();
  const fileName = uri.split('/').pop();

  // Asegúrate de que el objeto que agregas a formData coincida con lo que espera ImgBB
  // y lo que React Native puede manejar. El `any` es a menudo necesario aquí.
  formData.append('image', {
      uri: uri,
      // Proporciona un tipo mime adecuado. 'image/jpeg' es un buen default si no estás seguro.
      type: `image/${fileType || 'jpeg'}`,
      // Proporciona un nombre de archivo, puede ser genérico o el original.
      name: fileName || `upload.${fileType || 'jpg'}`,
  } as any);

  try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMG_BB_API_KEY}`, {
          method: 'POST',
          body: formData,
          // No establezcas 'Content-Type': 'multipart/form-data' manualmente,
          // fetch lo hará automáticamente y correctamente con FormData.
      });

      const json = await response.json();

      if (json.data && json.data.url) {
          console.log('[uploadImage] Imagen subida con éxito a ImgBB:', json.data.url);
          return json.data.url;
      } else {
          // Captura el mensaje de error específico de ImgBB si está disponible
          const errorMessage = json.error?.message || json.status_txt || "Error desconocido al subir la imagen a ImgBB.";
          console.error("[uploadImage] Error de ImgBB:", errorMessage, json);
          throw new Error(errorMessage);
      }
  } catch (error: any) {
      console.error("[uploadImage] Error general durante la subida a ImgBB:", error);
      Alert.alert("Error de Subida", `No se pudo subir la imagen: ${error.message}`);
      return null;
  }
};

