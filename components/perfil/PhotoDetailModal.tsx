import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, ScrollView, KeyboardAvoidingView, Platform, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, IconButton, TextInput, Avatar, useTheme, Divider, ActivityIndicator, Surface } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const { width, height } = Dimensions.get('window');

interface Comment {
  id: number;
  comentario: string;
  fecha_comentario: string;
  usuario: {
    usuario: string;
    avatar_url: string | null;
  };
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  photoUrl: string;
  photoId: number;
  photoOwnerId: number;
  description?: string;
  date?: string;
}

export const PhotoDetailModal = ({ visible, onDismiss, photoUrl, photoId, photoOwnerId, description, date }: Props) => {
  const theme = useTheme();
  const { userId } = useUser();

  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Datos del dueño de la foto (para mostrar en el header del post)
  const [ownerProfile, setOwnerProfile] = useState<{usuario: string, avatar_url: string | null} | null>(null);

  // Referencia para capturar la vista
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    if (visible && photoId) {
      fetchOwnerProfile();
      fetchLikes();
      fetchComments();
    }
  }, [visible, photoId]);

  const fetchOwnerProfile = async () => {
      try {
          const { data } = await supabase
            .from('usuarios')
            .select('usuario, avatar_url')
            .eq('id', photoOwnerId)
            .single();
          setOwnerProfile(data);
      } catch (e) {
          console.error("Error fetching owner:", e);
      }
  };

  const fetchLikes = async () => {
    try {
      const { count } = await supabase
        .from('foto_likes')
        .select('*', { count: 'exact', head: true })
        .eq('foto_id', photoId);

      setLikesCount(count || 0);

      if (userId) {
        const { data } = await supabase
          .from('foto_likes')
          .select('id')
          .eq('foto_id', photoId)
          .eq('usuario_id', userId)
          .maybeSingle();
        setIsLiked(!!data);
      }
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('foto_comentarios')
        .select(`
          id,
          comentario,
          fecha_comentario,
          usuario:usuarios!fk_usuario_comentario (
            usuario,
            avatar_url
          )
        `)
        .eq('foto_id', photoId)
        .order('fecha_comentario', { ascending: true });

      if (error) throw error;

      // Mapeo seguro
      const mappedComments = (data || []).map((item: any) => ({
        id: item.id,
        comentario: item.comentario,
        fecha_comentario: item.fecha_comentario,
        usuario: item.usuario
      }));

      setComments(mappedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const createNotification = async (tipo: 'like' | 'comentario', mensaje: string) => {
    if (!userId || userId === photoOwnerId) return;
    try {
      await supabase.from('notificaciones').insert({
        usuario_id: photoOwnerId,
        origen_usuario_id: userId,
        tipo: tipo,
        mensaje: mensaje,
        referencia_tipo: 'foto',
        referencia_id: photoId,
        leido: false
      });
    } catch (e) {
      console.error("Error creando notificación", e);
    }
  };

  const handleToggleLike = async () => {
    if (!userId) return;
    const previousLiked = isLiked;
    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      if (previousLiked) {
        await supabase.from('foto_likes').delete().eq('foto_id', photoId).eq('usuario_id', userId);
      } else {
        await supabase.from('foto_likes').insert({ foto_id: photoId, usuario_id: userId });
        createNotification('like', 'Le gustó tu foto');
      }
    } catch (error) {
      // Revertir si falla
      setIsLiked(previousLiked);
      setLikesCount(prev => previousLiked ? prev + 1 : prev - 1);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !userId) return;
    setSendingComment(true);
    try {
      const { error } = await supabase
        .from('foto_comentarios')
        .insert({
          foto_id: photoId,
          usuario_id: userId,
          comentario: newComment.trim()
        });

      if (error) throw error;

      createNotification('comentario', `Comentó: ${newComment.trim().substring(0, 20)}...`);
      setNewComment('');
      fetchComments(); // Refrescar comentarios
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el comentario.");
    } finally {
      setSendingComment(false);
    }
  };

  // Función para compartir imagen
  const handleShare = async () => {
    try {
      // Capturamos solo la imagen o una parte específica si envolvemos más cosas en ViewShot
      // En este caso, envolvemos la imagen principal para compartirla limpia.
      const uri = await viewShotRef.current?.capture?.();
      if (uri) {
        if (!(await Sharing.isAvailableAsync())) {
          Alert.alert("Error", "Compartir no está disponible en este dispositivo");
          return;
        }
        await Sharing.shareAsync(uri, {
            dialogTitle: 'Compartir foto de CaminAR',
            mimeType: 'image/jpeg',
            UTI: 'image/jpeg'
        });
      }
    } catch (error) {
      console.error("Error al compartir:", error);
      Alert.alert("Error", "No se pudo generar la imagen para compartir.");
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <Avatar.Image size={32} source={{ uri: item.usuario.avatar_url || 'https://avatar.iran.liara.run/public' }} style={{backgroundColor: '#eee'}} />
      <View style={styles.commentContent}>
        <Text variant="bodyMedium">
            <Text style={{fontWeight: 'bold'}}>{item.usuario.usuario} </Text>
            {item.comentario}
        </Text>
      </View>
    </View>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.fullScreenContainer}
        style={{ margin: 0 }} // Quitar márgenes del Modal nativo de paper
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >

                {/* --- HEADER: Usuario y Cerrar --- */}
                <View style={styles.header}>
                    <View style={styles.headerUser}>
                        <Avatar.Image
                            size={36}
                            source={{ uri: ownerProfile?.avatar_url || 'https://avatar.iran.liara.run/public' }}
                        />
                        <Text variant="titleMedium" style={styles.headerUsername}>{ownerProfile?.usuario || 'Usuario'}</Text>
                    </View>
                    <IconButton icon="close" onPress={onDismiss} size={26} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* --- IMAGEN PRINCIPAL --- */}
                    {/* Envolvemos la imagen en ViewShot para capturarla */}
                    <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
                        <View style={styles.imageWrapper}>
                            <Image
                                source={{ uri: photoUrl }}
                                style={styles.mainImage}
                                resizeMode="cover"
                            />
                            {/* Marca de agua opcional si se desea */}
                            {/* <View style={styles.watermark}><Text style={{color:'white', fontSize: 10}}>CaminAR</Text></View> */}
                        </View>
                    </ViewShot>

                    {/* --- ACCIONES (Like y Compartir) --- */}
                    <View style={styles.actionsBar}>
                        <View style={styles.leftActions}>
                            <TouchableOpacity onPress={handleToggleLike} style={styles.actionButton}>
                                <Icon
                                    name={isLiked ? "heart" : "heart-outline"}
                                    size={28}
                                    color={isLiked ? "#ED4956" : theme.colors.onSurface}
                                />
                            </TouchableOpacity>
                            {/* Botón de Compartir */}
                            <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                                <Icon
                                    name="share-variant-outline"
                                    size={26}
                                    color={theme.colors.onSurface}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* --- LIKES Y CAPTION --- */}
                    <View style={styles.infoSection}>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: 6 }}>
                            {likesCount} Me gusta
                        </Text>

                        {/* Caption del dueño */}
                        {description ? (
                            <View style={styles.captionContainer}>
                                <Text variant="bodyMedium">
                                    <Text style={{ fontWeight: 'bold' }}>{ownerProfile?.usuario} </Text>
                                    {description}
                                </Text>
                            </View>
                        ) : null}

                        {/* Fecha */}
                        <Text variant="labelSmall" style={{ color: '#8e8e8e', marginTop: 4, marginBottom: 12 }}>
                            {date ? new Date(date).toLocaleDateString() : 'Reciente'}
                        </Text>
                    </View>

                    <Divider style={{ height: 1, opacity: 0.5 }} />

                    {/* --- COMENTARIOS --- */}
                    <View style={styles.commentsSection}>
                        {loadingComments ? (
                            <ActivityIndicator size="small" style={{ marginTop: 20 }} />
                        ) : comments.length === 0 ? (
                            <View style={styles.noComments}>
                                <Text style={{ color: '#8e8e8e' }}>Sé el primero en comentar.</Text>
                            </View>
                        ) : (
                            comments.map((comment) => (
                                <View key={comment.id} style={styles.commentItemWrapper}>
                                    {renderComment({ item: comment })}
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>

                {/* --- INPUT DE COMENTARIO (Fixed Bottom) --- */}
                <View style={styles.inputWrapper}>
                    {/* Se eliminó el Avatar 404 */}
                    <TextInput
                        placeholder={`Añade un comentario como...`}
                        value={newComment}
                        onChangeText={setNewComment}
                        mode="flat"
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        style={styles.input}
                        contentStyle={{ paddingVertical: 0 }} // Centra texto en iOS
                        dense
                    />
                    {newComment.trim().length > 0 && (
                        <TouchableOpacity onPress={handleSendComment} disabled={sendingComment}>
                            {sendingComment ? (
                                <ActivityIndicator size={16} color={theme.colors.primary} />
                            ) : (
                                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Publicar</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </Portal>
  );
};

// Necesitamos SafeAreaView nativo dentro del modal
const SafeAreaView = ({ children, style }: {children: React.ReactNode, style?: any}) => (
    <View style={style}>{children}</View>
);

const styles = StyleSheet.create({
  fullScreenContainer: {
    backgroundColor: 'white',
    flex: 1,
    margin: 0,
    paddingTop: Platform.OS === 'ios' ? 40 : 0, // Ajuste para status bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUsername: {
    fontWeight: 'bold',
    marginLeft: 10,
  },
  scrollContent: {
    paddingBottom: 80, // Espacio para el input
  },
  imageWrapper: {
    width: width,
    height: width, // Cuadrado perfecto tipo Instagram (o 4:5 si se desea vertical)
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  watermark: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 4,
      borderRadius: 4
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
  },
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  captionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  commentItemWrapper: {
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentContent: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },
  noComments: {
    padding: 20,
    alignItems: 'center',
  },
  // Input Bar
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#dbdbdb',
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    height: 40,
    fontSize: 14,
    paddingHorizontal: 0,
  }
});