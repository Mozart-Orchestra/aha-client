import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Item } from '@/components/ui/Item';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { ItemList } from '@/components/ui/ItemList';
import { useLocalSettings, useSettingMutable } from '@/sync/storage';
import { t, getLanguageNativeName, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/text';
import { Modal } from '@/modal';
import { useUpdates } from '@/hooks/useUpdates';
import { PRIMARY_LANGUAGE_CODES } from '@/text/automaticLanguage';

type LanguageOption = 'auto' | SupportedLanguage;

interface LanguageItem {
    key: LanguageOption;
    title: string;
    subtitle?: string;
}

export default function LanguageSettingsScreen() {
    const [preferredLanguage, setPreferredLanguage] = useSettingMutable('preferredLanguage');
    const localSettings = useLocalSettings();
    const { reloadApp } = useUpdates();

    const detectedLanguage = localSettings.autoDetectedLanguage === 'zh-Hans' ? 'zh-Hans' : 'en';
    const detectedLanguageName = getLanguageNativeName(detectedLanguage);
    const isPrimaryPreferredLanguage = preferredLanguage === 'en' || preferredLanguage === 'zh-Hans';

    // Current selection
    const currentSelection: LanguageOption = preferredLanguage === null
        ? 'auto'
        : isPrimaryPreferredLanguage
            ? preferredLanguage as SupportedLanguage
            : 'auto';

    // Language options - dynamically generated from supported languages
    const languageOptions: LanguageItem[] = [
        {
            key: 'auto',
            title: t('settingsLanguage.automatic'),
            subtitle: `${t('settingsLanguage.automaticSubtitle')} (${detectedLanguageName})`
        },
        ...PRIMARY_LANGUAGE_CODES.map(code => ({
            key: code,
            title: getLanguageNativeName(code)
        }))
    ];

    const handleLanguageChange = async (newLanguage: LanguageOption) => {
        if (newLanguage === currentSelection) {
            return; // No change
        }

        // Show confirmation modal
        const confirmed = await Modal.confirm(
            t('settingsLanguage.needsRestart'),
            t('settingsLanguage.needsRestartMessage')
        );

        if (confirmed) {
            // Update the preference
            const newPreference = newLanguage === 'auto' ? null : newLanguage;
            setPreferredLanguage(newPreference);

            // Small delay to ensure setting is saved
            setTimeout(() => {
                reloadApp();
            }, 100);
        }
    };

    return (
        <ItemList style={{ paddingTop: 0 }}>
            <ItemGroup 
                title={t('settingsLanguage.currentLanguage')} 
                footer={t('settingsLanguage.description')}
            >
                {languageOptions.map((option) => (
                    <Item
                        key={option.key}
                        title={option.title}
                        subtitle={option.subtitle}
                        icon={<Ionicons 
                            name="language-outline" 
                            size={29} 
                            color="#007AFF" 
                        />}
                        rightElement={
                            currentSelection === option.key ? (
                                <Ionicons 
                                    name="checkmark" 
                                    size={20} 
                                    color="#007AFF" 
                                />
                            ) : null
                        }
                        onPress={() => handleLanguageChange(option.key)}
                        showChevron={false}
                    />
                ))}
            </ItemGroup>
        </ItemList>
    );
}
