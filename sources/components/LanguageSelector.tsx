import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUnistyles } from 'react-native-unistyles';
import { initializeLanguage, changeLanguage, getSupportedLanguages } from '@/i18n';

// 导入i18n
let i18n: any;
try {
  i18n = require('@/i18n').default;
} catch (e) {
  console.warn('i18n not yet available');
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export function LanguageSelector() {
  const { theme } = useUnistyles();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [languages, setLanguages] = useState<LanguageOption[]>([]);

  // 初始化i18n和加载语言列表
  useEffect(() => {
    const initI18n = async () => {
      try {
        // 初始化i18n
        await initializeLanguage();

        // 获取支持的语言
        const supportedLanguages = getSupportedLanguages();
        setLanguages(supportedLanguages);

        // 获取当前语言
        const currentLang = i18n ? i18n.language : 'en';
        setCurrentLanguage(currentLang);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
      }
    };

    initI18n();
  }, []);

  // 切换语言
  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
      setModalVisible(false);

      // 显示成功提示
      if (Platform.OS === 'ios') {
        // iOS不使用Alert，直接静默切换
        console.log('Language changed to:', languageCode);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  // 获取当前语言的显示名称
  const getCurrentLanguageName = () => {
    const currentLang = languages.find(lang => lang.code === currentLanguage);
    return currentLang ? currentLang.nativeName : 'English';
  };

  return (
    <>
      {/* 触发按钮 */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons name="language-outline" size={29} color="#007AFF" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: theme.colors.text }}>
              语言 / Language
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginRight: 8 }}>
            {getCurrentLanguageName()}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </View>
      </Pressable>

      {/* 语言选择模态框 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '70%',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.divider,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text }}>
                选择语言 / Select Language
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            {/* Language List */}
            <ScrollView style={{ flex: 1 }}>
              {languages.map((language) => {
                const isSelected = language.code === currentLanguage;
                return (
                  <Pressable
                    key={language.code}
                    onPress={() => handleLanguageChange(language.code)}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 16,
                      backgroundColor: isSelected ? theme.colors.input.background : theme.colors.surface,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.divider,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: isSelected ? '600' : '400',
                        color: theme.colors.text,
                        marginBottom: 4,
                      }}>
                        {language.nativeName}
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: theme.colors.textSecondary,
                      }}>
                        {language.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.divider,
            }}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={{
                  backgroundColor: theme.colors.input.background,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#007AFF' }}>
                  取消 / Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
