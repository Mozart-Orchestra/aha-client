import type { TranslationStructure } from '../_default';

/**
 * Catalan plural helper function
 * Catalan has 2 plural forms: singular, plural
 * @param options - Object containing count, singular, and plural forms
 * @returns The appropriate form based on Catalan plural rules
 */
function plural({ count, singular, plural }: { count: number; singular: string; plural: string }): string {
    return count === 1 ? singular : plural;
}

/**
 * Catalan translations for the Aha app
 * Must match the exact structure of the English translations
 */
export const ca: TranslationStructure = {
    tabs: {
        // Tab navigation labels
        inbox: 'Safata',
        sessions: 'Terminals',
        settings: 'Configuració',
    },

    inbox: {
        // Inbox screen
        emptyTitle: 'Safata buida',
        emptyDescription: 'Connecta\'t amb amics per començar a compartir sessions',
        updates: 'Actualitzacions',
    },

    common: {
        // Simple string constants
        cancel: 'Cancel·la',
        authenticate: 'Autentica',
        save: 'Desa',
        error: 'Error',
        success: 'Èxit',
        ok: 'D\'acord',
        continue: 'Continua',
        back: 'Enrere',
        create: 'Crear',
        rename: 'Reanomena',
        reset: 'Reinicia',
        logout: 'Tanca la sessió',
        yes: 'Sí',
        no: 'No',
        discard: 'Descarta',
        version: 'Versió',
        copied: 'Copiat',
        scanning: 'Escanejant...',
        urlPlaceholder: 'https://exemple.com',
        home: 'Inici',
        message: 'Missatge',
        files: 'Fitxers',
        fileViewer: 'Visualitzador de fitxers',
        loading: 'Carregant...',
        retry: 'Torna-ho a provar',
        connect: 'Connectar',
    },

    profile: {
        userProfile: 'Perfil d\'usuari',
        details: 'Detalls',
        firstName: 'Nom',
        lastName: 'Cognoms',
        username: 'Nom d\'usuari',
        status: 'Estat',
    },

    status: {
        connected: 'connectat',
        connecting: 'connectant',
        disconnected: 'desconnectat',
        error: 'error',
        online: 'en línia',
        offline: 'fora de línia',
        lastSeen: ({ time }: { time: string }) => `vist per última vegada ${time}`,
        permissionRequired: 'permís requerit',
        activeNow: 'Actiu ara',
        unknown: 'desconegut',
    },

    time: {
        justNow: 'ara mateix',
        minutesAgo: ({ count }: { count: number }) => `fa ${count} minut${count !== 1 ? 's' : ''}`,
        hoursAgo: ({ count }: { count: number }) => `fa ${count} hora${count !== 1 ? 'es' : ''}`,
    },

    connect: {
        restoreAccount: 'Restaura el compte',
        enterSecretKey: 'Introdueix la teva clau secreta',
        invalidSecretKey: 'Clau secreta no vàlida. Comprova-ho i torna-ho a provar.',
        enterUrlManually: 'Introdueix l\'URL manualment',
        enterUrlManuallyDescription: 'Introdueix l\'URL d\'un altre dispositiu per enllaçar el teu compte',
    },

    settings: {
        title: 'Configuració',
        connectedAccounts: 'Comptes connectats',
        connectAccount: 'Connectar compte',
        github: 'GitHub',
        machines: 'Màquines',
        features: 'Funcions',
        social: 'Social',
        account: 'Compte',
        accountSubtitle: 'Gestiona els detalls del teu compte',
        appearance: 'Aparença',
        appearanceSubtitle: 'Personalitza l\'aspecte de l\'aplicació',
        voiceAssistant: 'Assistent de veu',
        voiceAssistantSubtitle: 'Configura les preferències d\'interacció per veu',
        featuresTitle: 'Funcions',
        featuresSubtitle: 'Activa o desactiva les funcions de l\'aplicació',
        developer: 'Desenvolupador',
        developerTools: 'Eines de desenvolupador',
        about: 'Quant a',
        aboutFooter: 'aha és un client mòbil de Codex i Claude Code. Tot està xifrat punt a punt i el teu compte es guarda només al teu dispositiu. No està afiliat amb Anthropic.',
        whatsNew: 'Novetats',
        whatsNewSubtitle: 'Mira les últimes actualitzacions i millores',
        reportIssue: 'Informa d\'un problema',
        privacyPolicy: 'Política de privadesa',
        termsOfService: 'Condicions del servei',
        eula: 'EULA',
        supportUs: 'Dona\'ns suport',
        supportUsSubtitlePro: 'Gràcies pel teu suport!',
        supportUsSubtitle: 'Dona suport al desenvolupament del projecte',
        scanQrCodeToAuthenticate: 'Escaneja el codi QR per autenticar-te',
        githubConnected: ({ login }: { login: string }) => `Connectat com a @${login}`,
        connectGithubAccount: 'Connecta el teu compte de GitHub',
        claudeAuthSuccess: 'Connexió amb Claude realitzada amb èxit',
        exchangingTokens: 'Intercanviant tokens...',
        usage: 'Ús',
        usageSubtitle: "Veure l'ús de l'API i costos",

        // Dynamic settings messages
        accountConnected: ({ service }: { service: string }) => `Compte de ${service} connectat`,
        machineStatus: ({ name, status }: { name: string; status: 'online' | 'offline' }) =>
            `${name} està ${status === 'online' ? 'en línia' : 'fora de línia'}`,
        featureToggled: ({ feature, enabled }: { feature: string; enabled: boolean }) =>
            `${feature} ${enabled ? 'activada' : 'desactivada'}`,
    },

    settingsAppearance: {
        // Appearance settings screen
        theme: 'Tema',
        themeDescription: 'Tria el teu esquema de colors preferit',
        themeOptions: {
            adaptive: 'Adaptatiu',
            light: 'Clar', 
            dark: 'Fosc',
        },
        themeDescriptions: {
            adaptive: 'Segueix la configuració del sistema',
            light: 'Usa sempre el tema clar',
            dark: 'Usa sempre el tema fosc',
        },
        display: 'Pantalla',
        displayDescription: 'Controla la disposició i l\'espaiat',
        inlineToolCalls: 'Crides d\'eines en línia',
        inlineToolCallsDescription: 'Mostra les crides d\'eines directament als missatges de xat',
        expandTodoLists: 'Expandeix les llistes de tasques',
        expandTodoListsDescription: 'Mostra totes les tasques en lloc de només els canvis',
        showLineNumbersInDiffs: 'Mostra els números de línia a les diferències',
        showLineNumbersInDiffsDescription: 'Mostra els números de línia a les diferències de codi',
        showLineNumbersInToolViews: 'Mostra els números de línia a les vistes d\'eines',
        showLineNumbersInToolViewsDescription: 'Mostra els números de línia a les diferències de vistes d\'eines',
        wrapLinesInDiffs: 'Ajusta les línies a les diferències',
        wrapLinesInDiffsDescription: 'Ajusta les línies llargues en lloc de desplaçament horitzontal a les vistes de diferències',
        alwaysShowContextSize: 'Mostra sempre la mida del context',
        alwaysShowContextSizeDescription: 'Mostra l\'ús del context fins i tot quan no estigui prop del límit',
        avatarStyle: 'Estil d\'avatar',
        avatarStyleDescription: 'Tria l\'aparença de l\'avatar de la sessió',
        avatarOptions: {
            pixelated: 'Pixelat',
            gradient: 'Gradient',
            brutalist: 'Brutalista',
        },
        showFlavorIcons: "Mostrar icones de proveïdors d'IA",
        showFlavorIconsDescription: "Mostrar icones del proveïdor d'IA als avatars de sessió",
        compactSessionView: 'Vista compacta de sessions',
        compactSessionViewDescription: 'Mostra les sessions actives en un disseny més compacte',
    },

    settingsFeatures: {
        // Features settings screen
        experiments: 'Experiments',
        experimentsDescription: 'Activa funcions experimentals que encara estan en desenvolupament. Aquestes funcions poden ser inestables o canviar sense avís.',
        experimentalFeatures: 'Funcions experimentals',
        experimentalFeaturesEnabled: 'Funcions experimentals activades',
        experimentalFeaturesDisabled: 'Utilitzant només funcions estables',
        webFeatures: 'Funcions web',
        webFeaturesDescription: 'Funcions disponibles només a la versió web de l\'app.',
        commandPalette: 'Paleta de comandes',
        commandPaletteEnabled: 'Prem ⌘K per obrir',
        commandPaletteDisabled: 'Accés ràpid a comandes desactivat',
        markdownCopyV2: 'Markdown Copy v2',
        markdownCopyV2Subtitle: 'Pulsació llarga obre modal de còpia',
        hideInactiveSessions: 'Amaga les sessions inactives',
        hideInactiveSessionsSubtitle: 'Mostra només els xats actius a la llista',
    },

    errors: {
        networkError: 'Error de connexió',
        serverError: 'Error del servidor',
        unknownError: 'Error desconegut',
        connectionTimeout: 'S\'ha esgotat el temps de connexió',
        authenticationFailed: 'L\'autenticació ha fallat',
        permissionDenied: 'Permís denegat',
        fileNotFound: 'Fitxer no trobat',
        invalidFormat: 'Format no vàlid',
        operationFailed: 'L\'operació ha fallat',
        tryAgain: 'Torna-ho a provar',
        contactSupport: 'Contacta amb el suport si el problema persisteix',
        sessionNotFound: 'Sessió no trobada',
        voiceSessionFailed: 'Ha fallat l\'inici de la sessió de veu',
        oauthInitializationFailed: 'Ha fallat la inicialització del flux OAuth',
        tokenStorageFailed: 'Ha fallat l\'emmagatzematge dels tokens d\'autenticació',
        oauthStateMismatch: 'Ha fallat la validació de seguretat. Si us plau, torna-ho a provar',
        tokenExchangeFailed: 'Ha fallat l\'intercanvi del codi d\'autorització',
        oauthAuthorizationDenied: 'L\'autorització ha estat denegada',
        webViewLoadFailed: 'Ha fallat la càrrega de la pàgina d\'autenticació',
        failedToLoadProfile: 'No s\'ha pogut carregar el perfil d\'usuari',
        userNotFound: 'Usuari no trobat',
        sessionDeleted: 'La sessió s\'ha eliminat',
        sessionDeletedDescription: 'Aquesta sessió s\'ha eliminat permanentment',

        // Error functions with context
        fieldError: ({ field, reason }: { field: string; reason: string }) =>
            `${field}: ${reason}`,
        validationError: ({ field, min, max }: { field: string; min: number; max: number }) =>
            `${field} ha d'estar entre ${min} i ${max}`,
        retryIn: ({ seconds }: { seconds: number }) =>
            `Torna-ho a provar en ${seconds} ${seconds === 1 ? 'segon' : 'segons'}`,
        errorWithCode: ({ message, code }: { message: string; code: number | string }) =>
            `${message} (Error ${code})`,
        disconnectServiceFailed: ({ service }: { service: string }) => 
            `Ha fallat la desconnexió de ${service}`,
        connectServiceFailed: ({ service }: { service: string }) =>
            `No s'ha pogut connectar ${service}. Si us plau, torna-ho a provar.`,
        failedToLoadFriends: 'No s\'ha pogut carregar la llista d\'amics',
        failedToAcceptRequest: 'No s\'ha pogut acceptar la sol·licitud d\'amistat',
        failedToRejectRequest: 'No s\'ha pogut rebutjar la sol·licitud d\'amistat',
        failedToRemoveFriend: 'No s\'ha pogut eliminar l\'amic',
        searchFailed: 'La cerca ha fallat. Si us plau, torna-ho a provar.',
        failedToSendRequest: 'No s\'ha pogut enviar la sol·licitud d\'amistat',
    },

    newSession: {
        // Used by new-session screen and launch flows
        title: 'Inicia una nova sessió',
        noMachinesFound: 'No s\'han trobat màquines. Inicia una sessió de aha al teu ordinador primer.',
        allMachinesOffline: 'Totes les màquines estan fora de línia',
        machineDetails: 'Veure detalls de la màquina →',
        directoryDoesNotExist: 'Directori no trobat',
        createDirectoryConfirm: ({ directory }: { directory: string }) => `El directori ${directory} no existeix. Vols crear-lo?`,
        sessionStarted: 'Sessió iniciada',
        sessionStartedMessage: 'La sessió s\'ha iniciat correctament.',
        sessionSpawningFailed: 'Ha fallat la creació de la sessió - no s\'ha retornat cap ID de sessió.',
        failedToStart: 'Ha fallat l\'inici de la sessió. Assegura\'t que el dimoni s\'estigui executant a la màquina de destinació.',
        sessionTimeout: 'L\'inici de la sessió ha esgotat el temps d\'espera. La màquina pot ser lenta o el dimoni pot no estar responent.',
        notConnectedToServer: 'No connectat al servidor. Comprova la teva connexió a internet.',
        startingSession: 'Iniciant la sessió...',
        startNewSessionInFolder: 'Nova sessió aquí',
        noMachineSelected: 'Si us plau, selecciona una màquina per iniciar la sessió',
        noPathSelected: 'Si us plau, selecciona un directori per iniciar la sessió',
        promptRequiredForStartedSession: 'Introdueix un prompt o tria "Crear sessió buida".',
        emptySessionSetup: 'Configuració de la sessió buida (opcional)',
        sessionNamePlaceholder: 'Nom de la sessió (opcional)',
        sessionRolePlaceholder: "Rol de l'agent (opcional, ex. reviewer)",
        createEmptySession: 'Crear sessió buida',
        creatingSession: 'Creant sessió...',
        sessionType: {
            title: 'Tipus de sessió',
            simple: 'Simple',
            worktree: 'Worktree',
            comingSoon: 'Properament',
        },
        worktree: {
            creating: ({ name }: { name: string }) => `Creant worktree '${name}'...`,
            notGitRepo: 'Els worktrees requereixen un repositori git',
            failed: ({ error }: { error: string }) => `Error en crear el worktree: ${error}`,
            success: 'Worktree creat amb èxit',
        }
    },

    sessionHistory: {
        // Used by session history screen
        title: 'Historial de sessions',
        empty: 'No s\'han trobat sessions',
        today: 'Avui',
        yesterday: 'Ahir',
        daysAgo: ({ count }: { count: number }) => `fa ${count} ${count === 1 ? 'dia' : 'dies'}`,
        viewAll: 'Veure totes les sessions',
    },

    session: {
        inputPlaceholder: 'Escriu un missatge...',
    },

    commandPalette: {
        placeholder: 'Escriu una comanda o cerca...',
    },

    server: {
        // Used by Server Configuration screen (app/(app)/server.tsx)
        serverConfiguration: 'Configuració del servidor',
        enterServerUrl: 'Introdueix una URL del servidor',
        notValidHappyServer: 'No és un aha server vàlid',
        changeServer: 'Canvia el servidor',
        continueWithServer: 'Continuar amb aquest servidor?',
        resetToDefault: 'Reinicia per defecte',
        resetServerDefault: 'Reiniciar el servidor per defecte?',
        validating: 'Validant...',
        validatingServer: 'Validant el servidor...',
        serverReturnedError: 'El servidor ha retornat un error',
        failedToConnectToServer: 'Ha fallat la connexió amb el servidor',
        currentlyUsingCustomServer: 'Actualment utilitzant un servidor personalitzat',
        customServerUrlLabel: 'URL del servidor personalitzat',
        advancedFeatureFooter: 'Aquesta és una funció avançada. Només canvia el servidor si saps el que fas. Hauràs de tancar la sessió i tornar-la a iniciar després de canviar els servidors.'
    },

    sessionInfo: {
        // Used by Session Info screen (app/(app)/session/[id]/info.tsx)
        killSession: 'Finalitza la sessió',
        killSessionConfirm: 'Segur que vols finalitzar aquesta sessió?',
        archiveSession: 'Arxiva la sessió',
        archiveSessionConfirm: 'Segur que vols arxivar aquesta sessió?',
        happySessionIdCopied: 'aha session ID copiat al porta-retalls',
        failedToCopySessionId: 'Ha fallat copiar aha session ID',
        happySessionId: 'aha session ID',
        claudeCodeSessionId: 'ID de la sessió de Claude Code',
        claudeCodeSessionIdCopied: 'ID de la sessió de Claude Code copiat al porta-retalls',
        aiProvider: 'Proveïdor d\'IA',
        failedToCopyClaudeCodeSessionId: 'Ha fallat copiar l\'ID de la sessió de Claude Code',
        metadataCopied: 'Metadades copiades al porta-retalls',
        failedToCopyMetadata: 'Ha fallat copiar les metadades',
        failedToKillSession: 'Ha fallat finalitzar la sessió',
        failedToArchiveSession: 'Ha fallat arxivar la sessió',
        connectionStatus: 'Estat de la connexió',
        created: 'Creat',
        lastUpdated: 'Última actualització',
        sequence: 'Seqüència',
        quickActions: 'Accions ràpides',
        viewMachine: 'Veure la màquina',
        viewMachineSubtitle: 'Veure detalls de la màquina i sessions',
        killSessionSubtitle: 'Finalitzar immediatament la sessió',
        archiveSessionSubtitle: 'Arxiva aquesta sessió i atura-la',
        metadata: 'Metadades',
        host: 'Host',
        path: 'Camí',
        operatingSystem: 'Sistema operatiu',
        processId: 'ID del procés',
        happyHome: 'aha home',
        copyMetadata: 'Copia les metadades',
        agentState: 'Estat de l\'agent',
        controlledByUser: 'Controlat per l\'usuari',
        pendingRequests: 'Sol·licituds pendents',
        activity: 'Activitat',
        thinking: 'Pensant',
        thinkingSince: 'Pensant des de',
        cliVersion: 'Versió del CLI',
        cliVersionOutdated: 'Actualització del CLI requerida',
        cliVersionOutdatedMessage: ({ currentVersion, requiredVersion }: { currentVersion: string; requiredVersion: string }) =>
            `Versió ${currentVersion} instal·lada. Actualitzeu a ${requiredVersion} o posterior`,
        updateCliInstructions: 'Si us plau executeu npm install -g aha-coder@latest',
        deleteSession: 'Elimina la sessió',
        deleteSessionSubtitle: 'Elimina permanentment aquesta sessió',
        deleteSessionConfirm: 'Eliminar la sessió permanentment?',
        deleteSessionWarning: 'Aquesta acció no es pot desfer. Tots els missatges i dades associats amb aquesta sessió s\'eliminaran permanentment.',
        failedToDeleteSession: 'Error en eliminar la sessió',
        sessionDeleted: 'Sessió eliminada amb èxit',
        
    },

    components: {
        emptyMainScreen: {
            // Used by EmptyMainScreen component
            readyToCode: 'Llest per programar?',
            installCli: 'Instal·la el aha CLI',
            runIt: 'Executa\'l',
            scanQrCode: 'Escaneja el codi QR',
            openCamera: 'Obre la càmera',
        },
    },

    agentInput: {
        permissionMode: {
            title: 'MODE DE PERMISOS',
            default: 'Per defecte',
            acceptEdits: 'Accepta edicions',
            plan: 'Mode de planificació',
            bypassPermissions: 'Mode Yolo',
            badgeAcceptAllEdits: 'Accepta totes les edicions',
            badgeBypassAllPermissions: 'Omet tots els permisos',
            badgePlanMode: 'Mode de planificació',
        },
        agent: {
            claude: 'Claude',
            codex: 'Codex',
        },
        model: {
            title: 'MODEL',
            default: 'Utilitza la configuració del CLI',
            adaptiveUsage: 'Opus fins al 50% d\'ús, després Sonnet',
            sonnet: 'Sonnet',
            opus: 'Opus',
        },
        codexPermissionMode: {
            title: 'MODE DE PERMISOS CODEX',
            default: 'Configuració del CLI',
            readOnly: 'Read Only Mode',
            safeYolo: 'Safe YOLO',
            yolo: 'YOLO',
            badgeReadOnly: 'Read Only Mode',
            badgeSafeYolo: 'Safe YOLO',
            badgeYolo: 'YOLO',
        },
        codexModel: {
            title: 'MODEL CODEX',
            gpt5CodexLow: 'gpt-5-codex low',
            gpt5CodexMedium: 'gpt-5-codex medium',
            gpt5CodexHigh: 'gpt-5-codex high',
            gpt5Minimal: 'GPT-5 Mínim',
            gpt5Low: 'GPT-5 Baix',
            gpt5Medium: 'GPT-5 Mitjà',
            gpt5High: 'GPT-5 Alt',
        },
        context: {
            remaining: ({ percent }: { percent: number }) => `${percent}% restant`,
        },
        suggestion: {
            fileLabel: 'FITXER',
            folderLabel: 'CARPETA',
        },
        noMachinesAvailable: 'Sense màquines',
    },

    machineLauncher: {
        showLess: 'Mostra menys',
        showAll: ({ count }: { count: number }) => `Mostra tots (${count} camins)`,
        enterCustomPath: 'Introdueix un camí personalitzat',
        offlineUnableToSpawn: 'No es pot crear una nova sessió, fora de línia',
    },

    sidebar: {
        sessionsTitle: 'aha',
    },

    toolView: {
        input: 'Entrada',
        output: 'Sortida',
    },

    tools: {
        fullView: {
            description: 'Descripció',
            inputParams: 'Paràmetres d\'entrada',
            output: 'Sortida',
            error: 'Error',
            completed: 'Eina completada amb èxit',
            noOutput: 'No s\'ha produït cap sortida',
            running: 'L\'eina s\'està executant...',
            rawJsonDevMode: 'JSON en brut (mode desenvolupador)',
        },
        taskView: {
            initializing: 'Inicialitzant l\'agent...',
            moreTools: ({ count }: { count: number }) => `+${count} més ${plural({ count, singular: 'eina', plural: 'eines' })}`,
        },
        multiEdit: {
            editNumber: ({ index, total }: { index: number; total: number }) => `Edició ${index} de ${total}`,
            replaceAll: 'Reemplaça tot',
        },
        names: {
            task: 'Tasca',
            terminal: 'Terminal',
            searchFiles: 'Cerca fitxers',
            search: 'Cerca',
            searchContent: 'Cerca contingut',
            listFiles: 'Llista fitxers',
            planProposal: 'Proposta de pla',
            readFile: 'Llegeix fitxer',
            editFile: 'Edita fitxer',
            writeFile: 'Escriu fitxer',
            fetchUrl: 'Obté URL',
            readNotebook: 'Llegeix quadern',
            editNotebook: 'Edita quadern',
            todoList: 'Llista de tasques',
            webSearch: 'Cerca web',
            reasoning: 'Raonament',
            applyChanges: 'Actualitza fitxer',
            viewDiff: 'Canvis del fitxer actual',
        },
        desc: {
            terminalCmd: ({ cmd }: { cmd: string }) => `Terminal(cmd: ${cmd})`,
            searchPattern: ({ pattern }: { pattern: string }) => `Cerca(patró: ${pattern})`,
            searchPath: ({ basename }: { basename: string }) => `Cerca(camí: ${basename})`,
            fetchUrlHost: ({ host }: { host: string }) => `Obté URL(url: ${host})`,
            editNotebookMode: ({ path, mode }: { path: string; mode: string }) => `Edita quadern(fitxer: ${path}, mode: ${mode})`,
            todoListCount: ({ count }: { count: number }) => `Llista de tasques(quantitat: ${count})`,
            webSearchQuery: ({ query }: { query: string }) => `Cerca web(consulta: ${query})`,
            grepPattern: ({ pattern }: { pattern: string }) => `grep(patró: ${pattern})`,
            multiEditEdits: ({ path, count }: { path: string; count: number }) => `${path} (${count} edicions)`,
            readingFile: ({ file }: { file: string }) => `Llegint ${file}`,
            writingFile: ({ file }: { file: string }) => `Escrivint ${file}`,
            modifyingFile: ({ file }: { file: string }) => `Modificant ${file}`,
            modifyingFiles: ({ count }: { count: number }) => `Modificant ${count} fitxers`,
            modifyingMultipleFiles: ({ file, count }: { file: string; count: number }) => `${file} i ${count} més`,
            showingDiff: 'Mostrant canvis',
        }
    },

    files: {
        searchPlaceholder: 'Cerca fitxers...',
        detachedHead: 'HEAD separat',
        summary: ({ staged, unstaged }: { staged: number; unstaged: number }) => `${staged} preparats • ${unstaged} sense preparar`,
        notRepo: 'No és un repositori git',
        notUnderGit: 'Aquest directori no està sota control de versions git',
        searching: 'Cercant fitxers...',
        noFilesFound: 'No s\'han trobat fitxers',
        noFilesInProject: 'No hi ha fitxers al projecte',
        tryDifferentTerm: 'Prova un terme de cerca diferent',
        searchResults: ({ count }: { count: number }) => `Resultats de la cerca (${count})`,
        projectRoot: 'Arrel del projecte',
        stagedChanges: ({ count }: { count: number }) => `Canvis preparats (${count})`,
        unstagedChanges: ({ count }: { count: number }) => `Canvis sense preparar (${count})`,
        // File viewer strings
        loadingFile: ({ fileName }: { fileName: string }) => `Carregant ${fileName}...`,
        binaryFile: 'Fitxer binari',
        cannotDisplayBinary: 'No es pot mostrar el contingut del fitxer binari',
        diff: 'Diferències',
        file: 'Fitxer',
        fileEmpty: 'El fitxer està buit',
        noChanges: 'No hi ha canvis a mostrar',
    },

    settingsVoice: {
        // Voice settings screen
        languageTitle: 'Idioma',
        languageDescription: 'Tria el teu idioma preferit per a les interaccions amb l\'assistent de veu. Aquesta configuració es sincronitza a tots els teus dispositius.',
        preferredLanguage: 'Idioma preferit',
        preferredLanguageSubtitle: 'Idioma utilitzat per a les respostes de l\'assistent de veu',
        language: {
            searchPlaceholder: 'Cerca idiomes...',
            title: 'Idiomes',
            footer: ({ count }: { count: number }) => `${count} ${plural({ count, singular: 'idioma', plural: 'idiomes' })} disponibles`,
            autoDetect: 'Detecta automàticament',
        }
    },

    settingsAccount: {
        // Account settings screen
        accountInformation: 'Informació del compte',
        status: 'Estat',
        statusActive: 'Actiu',
        statusNotAuthenticated: 'No autenticat',
        anonymousId: 'ID anònim',
        publicId: 'ID públic',
        notAvailable: 'No disponible',
        linkNewDevice: 'Enllaça un nou dispositiu',
        linkNewDeviceSubtitle: 'Escaneja el codi QR per enllaçar el dispositiu',
        profile: 'Perfil',
        name: 'Nom',
        github: 'GitHub',
        tapToDisconnect: 'Toca per desconnectar',
        server: 'Servidor',
        backup: 'Còpia de seguretat',
        backupDescription: 'La teva clau secreta és l\'única manera de recuperar el teu compte. Desa-la en un lloc segur com un gestor de contrasenyes.',
        secretKey: 'Clau secreta',
        tapToReveal: 'Toca per revelar',
        tapToHide: 'Toca per ocultar',
        secretKeyLabel: 'CLAU SECRETA (TOCA PER COPIAR)',
        secretKeyCopied: 'Clau secreta copiada al porta-retalls. Desa-la en un lloc segur!',
        secretKeyCopyFailed: 'Ha fallat copiar la clau secreta',
        privacy: 'Privadesa',
        privacyDescription: 'Ajuda a millorar l\'aplicació compartint dades d\'ús anònimes. No es recopila informació personal.',
        analytics: 'Analítiques',
        analyticsDisabled: 'No es comparteixen dades',
        analyticsEnabled: 'Es comparteixen dades d\'ús anònimes',
        dangerZone: 'Zona de perill',
        logout: 'Tanca la sessió',
        logoutSubtitle: 'Tanca la sessió i esborra les dades locals',
        logoutConfirm: 'Estàs segur que vols tancar la sessió? Assegura\'t d\'haver fet una còpia de seguretat de la teva clau secreta!',
    },

    settingsLanguage: {
        // Language settings screen
        title: 'Idioma',
        description: 'Tria el teu idioma preferit per a la interfície de l\'app. Això se sincronitzarà a tots els teus dispositius.',
        currentLanguage: 'Idioma actual',
        automatic: 'Automàtic',
        automaticSubtitle: 'Detecta des de la configuració del dispositiu',
        needsRestart: 'Idioma canviat',
        needsRestartMessage: 'L\'aplicació necessita reiniciar-se per aplicar la nova configuració d\'idioma.',
        restartNow: 'Reinicia ara',
    },

    connectButton: {
        authenticate: 'Autentica el terminal',
        authenticateWithUrlPaste: 'Autentica el terminal amb enganxat d\'URL',
        pasteAuthUrl: 'Enganxa l\'URL d\'autenticació del teu terminal',
    },

    updateBanner: {
        updateAvailable: 'Actualització disponible',
        pressToApply: 'Prem per aplicar l\'actualització',
        whatsNew: 'Novetats',
        seeLatest: 'Mira les últimes actualitzacions i millores',
        nativeUpdateAvailable: 'Actualització de l\'aplicació disponible',
        tapToUpdateAppStore: 'Toca per actualitzar a l\'App Store',
        tapToUpdatePlayStore: 'Toca per actualitzar a Play Store',
    },

    changelog: {
        // Used by the changelog screen
        version: ({ version }: { version: number }) => `Versió ${version}`,
        noEntriesAvailable: 'No hi ha entrades de registre de canvis disponibles.',
    },

    terminal: {
        // Used by terminal connection screens
        webBrowserRequired: 'Es requereix un navegador web',
        webBrowserRequiredDescription: 'Els enllaços de connexió de terminal només es poden obrir en un navegador web per raons de seguretat. Utilitza l\'escàner de codi QR o obre aquest enllaç en un ordinador.',
        processingConnection: 'Processant la connexió...',
        invalidConnectionLink: 'Enllaç de connexió no vàlid',
        invalidConnectionLinkDescription: 'L\'enllaç de connexió falta o no és vàlid. Comprova l\'URL i torna-ho a provar.',
        connectTerminal: 'Connecta el terminal',
        terminalRequestDescription: 'Un terminal està sol·licitant connectar-se al teu compte de aha. Això permetrà al terminal enviar i rebre missatges de forma segura.',
        connectionDetails: 'Detalls de la connexió',
        publicKey: 'Clau pública',
        encryption: 'Xifratge',
        endToEndEncrypted: 'Xifrat punt a punt',
        acceptConnection: 'Accepta la connexió',
        connecting: 'Connectant...',
        reject: 'Rebutja',
        security: 'Seguretat',
        securityFooter: 'Aquest enllaç de connexió s\'ha processat de forma segura al teu navegador i mai s\'ha enviat a cap servidor. Les teves dades privades es mantindran segures i només tu pots desxifrar els missatges.',
        securityFooterDevice: 'Aquesta connexió s\'ha processat de forma segura al teu dispositiu i mai s\'ha enviat a cap servidor. Les teves dades privades es mantindran segures i només tu pots desxifrar els missatges.',
        clientSideProcessing: 'Processament del costat del client',
        linkProcessedLocally: 'Enllaç processat localment al navegador',
        linkProcessedOnDevice: 'Enllaç processat localment al dispositiu',
    },

    modals: {
        // Used across connect flows and settings
        authenticateTerminal: 'Autentica el terminal',
        pasteUrlFromTerminal: 'Enganxa l\'URL d\'autenticació del teu terminal',
        deviceLinkedSuccessfully: 'Dispositiu enllaçat amb èxit',
        terminalConnectedSuccessfully: 'Terminal connectat amb èxit',
        invalidAuthUrl: 'URL d\'autenticació no vàlida',
        developerMode: 'Mode desenvolupador',
        developerModeEnabled: 'Mode desenvolupador activat',
        developerModeDisabled: 'Mode desenvolupador desactivat',
        disconnectGithub: 'Desconnecta GitHub',
        disconnectGithubConfirm: 'Segur que vols desconnectar el teu compte de GitHub?',
        disconnectService: ({ service }: { service: string }) => 
            `Desconnecta ${service}`,
        disconnectServiceConfirm: ({ service }: { service: string }) => 
            `Segur que vols desconnectar ${service} del teu compte?`,
        disconnect: 'Desconnecta',
        failedToConnectTerminal: 'Ha fallat connectar el terminal',
        cameraPermissionsRequiredToConnectTerminal: 'Es requereixen permisos de càmera per connectar el terminal',
        failedToLinkDevice: 'Ha fallat enllaçar el dispositiu',
        cameraPermissionsRequiredToScanQr: 'Es requereixen permisos de càmera per escanejar codis QR'
    },

    navigation: {
        // Navigation titles and screen headers
        connectTerminal: 'Connecta el terminal',
        linkNewDevice: 'Enllaça un nou dispositiu', 
        restoreWithSecretKey: 'Restaura amb clau secreta',
        whatsNew: 'Novetats',
        friends: 'Amics',
    },

    welcome: {
        // Main welcome screen for unauthenticated users
        title: 'Client mòbil de Codex i Claude Code',
        subtitle: 'Xifrat punt a punt i el teu compte s\'emmagatzema només al teu dispositiu.',
        createAccount: 'Crea un compte',
        linkOrRestoreAccount: 'Enllaça o restaura un compte',
        loginWithMobileApp: 'Inicia sessió amb l\'aplicació mòbil',
        scanToLink: 'O escaneja per enllaçar el dispositiu',
        scanQrCode: 'Escaneja el codi QR',
        enterUrlManually: 'Introdueix l\'URL manualment',
    },

    review: {
        // Used by utils/requestReview.ts
        enjoyingApp: 'T\'està agradant l\'aplicació?',
        feedbackPrompt: 'Ens encantaria conèixer la teva opinió!',
        yesILoveIt: 'Sí, m\'encanta!',
        notReally: 'No gaire'
    },

    items: {
        // Used by Item component for copy toast
        copiedToClipboard: ({ label }: { label: string }) => `${label} copiat al porta-retalls`
    },

    machine: {
        offlineUnableToSpawn: 'El llançador està desactivat mentre la màquina està fora de línia',
        offlineHelp: '• Assegura\'t que l\'ordinador estigui en línia\n• Executa `aha daemon status` per diagnosticar\n• Fas servir l\'última versió del CLI? Actualitza amb `npm install -g aha-coder@latest`',
        launchNewSessionInDirectory: 'Inicia una nova sessió al directori',
        daemon: 'Dimoni',
        status: 'Estat',
        stopDaemon: 'Atura el dimoni',
        lastKnownPid: 'Últim PID conegut',
        lastKnownHttpPort: 'Últim port HTTP conegut',
        startedAt: 'Iniciat a',
        cliVersion: 'Versió del CLI',
        daemonStateVersion: 'Versió de l\'estat del dimoni',
        activeSessions: ({ count }: { count: number }) => `Sessions actives (${count})`,
        machineGroup: 'Màquina',
        host: 'Host',
        machineId: 'ID de la màquina',
        username: 'Nom d\'usuari',
        homeDirectory: 'Directori principal',
        platform: 'Plataforma',
        architecture: 'Arquitectura',
        lastSeen: 'Vist per última vegada',
        never: 'Mai',
        metadataVersion: 'Versió de les metadades',
        untitledSession: 'Sessió sense títol',
        back: 'Enrere',
    },

    message: {
        switchedToMode: ({ mode }: { mode: string }) => `S'ha canviat al mode ${mode}`,
        unknownEvent: 'Esdeveniment desconegut',
        usageLimitUntil: ({ time }: { time: string }) => `Límit d'ús assolit fins a ${time}`,
        unknownTime: 'temps desconegut',
    },

    codex: {
        // Codex permission dialog buttons
        permissions: {
            yesForSession: 'Sí, i no preguntar per aquesta sessió',
            stopAndExplain: 'Atura, i explica què fer',
        }
    },

    claude: {
        // Claude permission dialog buttons
        permissions: {
            yesAllowAllEdits: 'Sí, permet totes les edicions durant aquesta sessió',
            yesForTool: 'Sí, no tornis a preguntar per aquesta eina',
            noTellClaude: 'No, i digues a Claude què fer diferent',
        }
    },

    textSelection: {
        // Text selection screen
        selectText: 'Seleccionar rang de text',
        title: 'Seleccionar text',
        noTextProvided: 'No s\'ha proporcionat text',
        textNotFound: 'Text no trobat o expirat',
        textCopied: 'Text copiat al porta-retalls',
        failedToCopy: 'No s\'ha pogut copiar el text al porta-retalls',
        noTextToCopy: 'No hi ha text disponible per copiar',
    },

    artifacts: {
        title: 'Artefactes',
        countSingular: '1 artefacte',
        countPlural: ({ count }: { count: number }) => `${count} artefactes`,
        empty: 'Encara no hi ha artefactes',
        emptyDescription: 'Crea el teu primer artefacte per desar i organitzar contingut',
        new: 'Nou artefacte',
        edit: 'Edita artefacte',
        delete: 'Elimina',
        updateError: 'No s\'ha pogut actualitzar l\'artefacte. Si us plau, torna-ho a provar.',
        notFound: 'Artefacte no trobat',
        discardChanges: 'Descartar els canvis?',
        discardChangesDescription: 'Tens canvis sense desar. Estàs segur que vols descartar-los?',
        deleteConfirm: 'Eliminar artefacte?',
        deleteConfirmDescription: 'Aquest artefacte s\'eliminarà permanentment.',
        titlePlaceholder: 'Títol de l\'artefacte',
        bodyPlaceholder: 'Escriu aquí el contingut...',
        save: 'Desa',
        saving: 'Desant...',
        loading: 'Carregant...',
        error: 'Error en carregar els artefactes',
        titleLabel: 'TÍTOL',
        bodyLabel: 'CONTINGUT',
        emptyFieldsError: 'Si us plau, introdueix un títol o contingut',
        createError: 'No s\'ha pogut crear l\'artefacte. Si us plau, torna-ho a provar.',
    },

    friends: {
        // Friends feature
        title: 'Amics',
        manageFriends: 'Gestiona els teus amics i connexions',
        searchTitle: 'Buscar amics',
        pendingRequests: 'Sol·licituds d\'amistat',
        myFriends: 'Els meus amics',
        noFriendsYet: 'Encara no tens amics',
        findFriends: 'Buscar amics',
        remove: 'Eliminar',
        pendingRequest: 'Pendent',
        sentOn: ({ date }: { date: string }) => `Enviat el ${date}`,
        accept: 'Acceptar',
        reject: 'Rebutjar',
        addFriend: 'Afegir amic',
        alreadyFriends: 'Ja sou amics',
        requestPending: 'Sol·licitud pendent',
        searchInstructions: 'Introdueix un nom d\'usuari per buscar amics',
        searchPlaceholder: 'Introdueix nom d\'usuari...',
        searching: 'Buscant...',
        userNotFound: 'Usuari no trobat',
        noUserFound: 'No s\'ha trobat cap usuari amb aquest nom',
        checkUsername: 'Si us plau, verifica el nom d\'usuari i torna-ho a provar',
        howToFind: 'Com trobar amics',
        findInstructions: 'Cerca amics pel seu nom d\'usuari. Tant tu com el teu amic heu de tenir GitHub connectat per enviar sol·licituds d\'amistat.',
        requestSent: 'Sol·licitud d\'amistat enviada!',
        requestAccepted: 'Sol·licitud d\'amistat acceptada!',
        requestRejected: 'Sol·licitud d\'amistat rebutjada',
        friendRemoved: 'Amic eliminat',
        confirmRemove: 'Eliminar amic',
        confirmRemoveMessage: 'Estàs segur que vols eliminar aquest amic?',
        cannotAddYourself: 'No pots enviar-te una sol·licitud d\'amistat a tu mateix',
        bothMustHaveGithub: 'Ambdós usuaris han de tenir GitHub connectat per ser amics',
        status: {
            none: 'No connectat',
            requested: 'Sol·licitud enviada',
            pending: 'Sol·licitud pendent',
            friend: 'Amics',
            rejected: 'Rebutjada',
        },
        acceptRequest: 'Acceptar sol·licitud',
        removeFriend: 'Eliminar dels amics',
        removeFriendConfirm: ({ name }: { name: string }) => `Estàs segur que vols eliminar ${name} dels teus amics?`,
        requestSentDescription: ({ name }: { name: string }) => `La teva sol·licitud d\'amistat ha estat enviada a ${name}`,
        requestFriendship: 'Sol·licitar amistat',
        cancelRequest: 'Cancel·lar sol·licitud d\'amistat',
        cancelRequestConfirm: ({ name }: { name: string }) => `Cancel·lar la teva sol·licitud d\'amistat a ${name}?`,
        denyRequest: 'Rebutjar sol·licitud',
        nowFriendsWith: ({ name }: { name: string }) => `Ara ets amic de ${name}`,
    },

    usage: {
        // Usage panel strings
        today: 'Avui',
        last7Days: 'Últims 7 dies',
        last30Days: 'Últims 30 dies',
        totalTokens: 'Tokens totals',
        totalCost: 'Cost total',
        tokens: 'Tokens',
        cost: 'Cost',
        usageOverTime: 'Ús al llarg del temps',
        byModel: 'Per model',
        noData: "No hi ha dades d'ús disponibles",
    },

    feed: {
        // Feed notifications for friend requests and acceptances
        friendRequestFrom: ({ name }: { name: string }) => `${name} t'ha enviat una sol·licitud d'amistat`,
        friendRequestGeneric: 'Nova sol·licitud d\'amistat',
        friendAccepted: ({ name }: { name: string }) => `Ara ets amic de ${name}`,
        friendAcceptedGeneric: 'Sol·licitud d\'amistat acceptada',
    },

    teams: {
        deleteConfirmTitle: 'Eliminar Equip',
        deleteConfirmMessage: ({ count, sessionText }: { count: number; sessionText: string }) =>
            `Estàs segur que vols eliminar aquest equip i ${count} ${sessionText} associades? Aquesta acció no es pot desfer.`,
        batchArchiveTitle: 'Arxivar equips',
        batchArchiveMessage: ({ teamCount, sessionCount }: { teamCount: number; sessionCount: number }) =>
            `Arxivar ${teamCount} equip(s) i ${sessionCount} sessió(ns) associades?`,
        batchArchiveSuccess: ({ count }: { count: number }) => `${count} equip(s) arxivat(s).`,
        batchArchiveError: 'Error en arxivar equips. Torna-ho a provar.',
        batchDeleteTitle: 'Eliminar equips',
        batchDeleteMessage: ({ teamCount, sessionCount }: { teamCount: number; sessionCount: number }) =>
            `Eliminar permanentment ${teamCount} equip(s) i ${sessionCount} sessió(ns) associades? Aquesta acció no es pot desfer.`,
        batchDeleteSuccess: ({ count }: { count: number }) => `${count} equip(s) eliminat(s).`,
        batchDeleteError: 'Error en eliminar equips. Torna-ho a provar.',
        archive: 'Arxivar',
        delete: 'Eliminar',
        teamNotFound: 'Equip no trobat',
        deleteError: 'Error en eliminar l\'equip. Torna-ho a provar.',
        renamePromptTitle: "Canvia el nom de l'equip",
        renamePromptMessage: 'Introdueix un nom nou per a aquest equip:',
        renamePromptPlaceholder: "Nom de l'equip",
        renameError: "No s'ha pogut canviar el nom de l'equip. Torna-ho a provar.",
        archiveConfirmTitle: 'Arxivar equip',
        archiveConfirmMessage: ({ count, sessionText }: { count: number; sessionText: string }) =>
            `Arxivar aquest equip i ${count} ${sessionText} associades?`,
        archiveSuccess: ({ count }: { count: number }) => `Equip arxivat amb ${count} sessió(ns).`,
        archiveError: "No s'ha pogut arxivar l'equip. Torna-ho a provar.",
        relaunch: 'Relança',
        relaunchNoRoles: 'Aquest equip encara no té cap configuració de rols desada per relançar.',
    },

    // TODO: Add Catalan translations for memory, rules, and teamRoles
    // Using English placeholders for now
    memory: {
        title: 'Memory Library',
        memory: 'Memory',
        createMemory: 'Create Memory',
        editMemory: 'Edit Memory',
        deleteMemory: 'Delete Memory',
        memoryDetails: 'Memory Details',
        searchMemories: 'Search Memories',
        filterMemories: 'Filter Memories',
        memoryType: 'Type',
        memoryCategory: 'Category',
        memoryTags: 'Tags',
        memoryImportance: 'Importance',
        memoryContent: 'Content',
        memoryCreated: 'Created',
        memoryUpdated: 'Updated',
        memoryAccessCount: 'Access Count',
        typeFact: 'Fact',
        typePreference: 'Preference',
        typeDecision: 'Decision',
        typeKnowledge: 'Knowledge',
        scopeGlobal: 'Global',
        scopeTeam: 'Team',
        scopeAgent: 'Agent',
        noMemories: 'No Memories',
        addMemoryTag: 'Add Tag',
        searchPlaceholder: 'Search memories by keyword, tag, or category...',
        importanceLevel: 'Importance',
        accessPattern: 'Access Pattern',
        recentlyAccessed: 'Recently Accessed',
        mostAccessed: 'Most Accessed',
        relatedMemories: 'Related Memories',
        linkMemory: 'Link Memory',
        memorySettings: 'Memory Settings',
        exportMemory: 'Export Memory',
        importMemory: 'Import Memory',
        createSuccess: 'Memory created successfully',
        updateSuccess: 'Memory updated successfully',
        deleteSuccess: 'Memory deleted successfully',
        deleteConfirm: 'Are you sure you want to delete this memory?',
        createError: 'Failed to create memory. Please try again.',
        updateError: 'Failed to update memory. Please try again.',
        deleteError: 'Failed to delete memory. Please try again.',
    },

    rules: {
        title: 'Global Rules',
        rule: 'Rule',
        createRule: 'Create Rule',
        editRule: 'Edit Rule',
        deleteRule: 'Delete Rule',
        ruleDetails: 'Rule Details',
        enableRule: 'Enable Rule',
        disableRule: 'Disable Rule',
        ruleCategory: 'Category',
        rulePriority: 'Priority',
        ruleDescription: 'Description',
        ruleEnabled: 'Enabled',
        ruleDisabled: 'Disabled',
        categoryCommunication: 'Communication',
        categoryBehavior: 'Behavior',
        categoryCoding: 'Coding',
        categorySecurity: 'Security',
        priorityLow: 'Low',
        priorityMedium: 'Medium',
        priorityHigh: 'High',
        scopeGlobal: 'Global',
        scopeTeam: 'Team',
        scopeAgent: 'Agent',
        scopeSession: 'Session',
        noRules: 'No Rules',
        addRule: 'Add Rule',
        ruleSettings: 'Rule Settings',
        ruleCompliance: 'Rule Compliance',
        compliant: 'Compliant',
        nonCompliant: 'Non-Compliant',
        activeRules: 'Active Rules',
        inactiveRules: 'Inactive Rules',
        ruleHistory: 'Rule History',
        ruleTemplate: 'Rule Template',
        saveAsTemplate: 'Save as Template',
        fromTemplate: 'From Template',
        createSuccess: 'Rule created successfully',
        updateSuccess: 'Rule updated successfully',
        deleteSuccess: 'Rule deleted successfully',
        enableSuccess: 'Rule enabled successfully',
        disableSuccess: 'Rule disabled successfully',
        deleteConfirm: 'Are you sure you want to delete this rule?',
        createError: 'Failed to create rule. Please try again.',
        updateError: 'Failed to update rule. Please try again.',
        deleteError: 'Failed to delete rule. Please try again.',
        enableError: 'Failed to enable rule. Please try again.',
        disableError: 'Failed to disable rule. Please try again.',
    },

    teamRoles: {
        user: {
            title: 'User',
            summary: 'Human user who provides requirements, reviews results, and makes final decisions',
            responsibilities: ['Provide project requirements and goals', 'Review team output and work results', 'Make key decisions and approvals', 'Provide feedback and guidance', 'Answer team member questions'],
            abilityBoundaries: ['Does not directly use MCP tools', 'Interacts with team through chat interface'],
            handoffProtocol: ['Provide clear requirement descriptions to Master', 'Respond promptly to team questions and requests', 'Review completed work and provide feedback'],
            protocol: ['You are the human user, the ultimate decision maker for the team.', '1. Provide clear requirements to Master.', '2. Respond to team member questions.', '3. Review work results and provide feedback.']
        },
        master: {
            title: 'Master',
            summary: 'Team leader who creates tasks, assigns work, and coordinates the team',
            responsibilities: ['Break down user requests into actionable tasks', 'Assign tasks to team members based on their roles', 'Monitor team progress and resolve blockers', 'Coordinate handoffs between team members', 'Maintain Kanban board accuracy', 'Make final decisions on task priorities'],
            abilityBoundaries: ['Always use create_task tool to create work items', 'Do not implement features directly - delegate to workers', 'Coordinate major architectural decisions with team'],
            handoffProtocol: ['Create tasks with clear acceptance criteria', 'Assign tasks to appropriate roles (builder, framer, etc.)', 'Monitor progress and unblock team members'],
            protocol: ['⚠️ CRITICAL: You are the MASTER. You CREATE and ASSIGN tasks.', "⚠️ CRITICAL: Use 'aha__create_task' to create tasks, NOT text plans.", '1. ANALYZE the user request.', '2. BREAK DOWN into specific, actionable tasks.', "3. CALL 'aha__create_task' for EACH item. Set assigneeRole appropriately.", "4. Use 'aha__send_team_message' to notify the team.", "5. Monitor progress with 'aha__list_tasks'.", "6. Resolve blockers with 'aha__resolve_blocker'."]
        },
        orchestrator: {
            title: 'Orchestrator',
            summary: 'Plans, delegates, and coordinates team workflows',
            responsibilities: ['Break down user requests into actionable tasks', 'Assign tasks based on role expertise', 'Monitor team progress and coordinate handoffs', 'Unblock team members and resolve conflicts', 'Maintain Kanban board accuracy', 'Consult architect for complex decisions'],
            abilityBoundaries: ['Never implement features without creating tasks first', 'Do not make unilateral architectural decisions without architect consultation', 'Coordinate with architect before major changes to code structure', 'Consult architect on complex decisions'],
            handoffProtocol: ['Present task distribution to architect for review before execution begins', 'Document decisions and rationale for all major changes', 'Coordinate testing strategy with qa-engineer'],
            protocol: ['⚠️ CRITICAL: You are the ONLY agent allowed to plan and distribute work.', "⚠️ CRITICAL: Text-based plans in chat are USELESS. You MUST use the 'create_task' tool.", '1. ANALYZE the user request.', '2. BREAK DOWN into specific, actionable tasks.', "3. CALL 'create_task' for EACH item. Assign to 'implementer' (backend) or 'architect' (frontend).", "4. ONLY AFTER creating tasks, use 'send_team_message' to notify the team: 'Tasks created. Please check Kanban.'", '5. IF you see a Worker trying to plan or assign tasks, STOP THEM immediately.', '6. IF the Kanban board is empty, you are failing. Create tasks immediately.']
        },
        architect: {
            title: 'Technical Architect',
            summary: 'Makes high-level architectural decisions and ensures technical coherence',
            responsibilities: ['Review code architecture and propose improvements', 'Define technical standards and best practices', 'Validate architectural decisions before implementation', 'Coordinate with implementer on design handoffs', 'Identify and resolve technical blockers', 'Document architectural decisions and rationale'],
            abilityBoundaries: ['Does not implement features without architect approval', 'Never merge to production without implementer sign-off', 'Focus on architecture, not implementation details', 'Coordinate all major changes through orchestrator'],
            handoffProtocol: ['Provide technical specifications and constraints', 'Review implementer design proposals before approval', 'Validate that acceptance criteria are met', 'Coordinate testing strategy with qa-engineer'],
            protocol: ['⚠️ CRITICAL: You are an ADVISORY role. You provide technical guidance.', '1. Review architectural proposals from implementer and orchestrator.', '2. Validate designs against best practices and performance requirements.', '3. APPROVE or REQUEST CHANGES before implementation begins.', '4. Document architectural decisions with clear rationale.', '5. Coordinate with qa-engineer for testing strategy.', '6. Focus on system architecture, libraries, and data flow.']
        },
        researcher: {
            title: 'Code Researcher',
            summary: 'Explores codebase, gathers information, and provides context for decisions',
            responsibilities: ['Search and analyze codebase to answer team questions', 'Investigate dependencies, file structures, and implementation details', 'Provide quick reconnaissance before tasks are assigned', 'Research external documentation and APIs', 'Document findings with clear citations to files/lines'],
            abilityBoundaries: ['Does not make changes to codebase', 'Read-only access to files and documentation', 'Use search tools (grep, find) to explore codebase'],
            handoffProtocol: ['Present findings via team message with clear citations to files/lines', 'Escalate if unable to locate requested information after reasonable effort'],
            protocol: ['⚠️ CRITICAL: You are a SUPPORT role. You DO NOT plan or implement.', '1. IGNORE requests from other Workers.', '2. Use search tools (grep, find, ast-grep) to explore codebase.', '3. Provide clear, concise answers with file paths and line numbers.', '4. Do NOT respond to general user chat unless explicitly mentioned.']
        },
        implementer: {
            title: 'Implementation Engineer',
            summary: 'Owns implementation, testing, and integration of features',
            responsibilities: ['Implement scoped work, keep diffs small, and drive tasks to completion', 'Keep Kanban history current: in-progress updates, blockers, and completion notes', 'Signal when code is ready for review with validation steps', 'Coordinate with architect for technical decisions', 'If blocked for >30 minutes, leave Kanban update tagging orchestrator'],
            abilityBoundaries: ['Do not redefine architecture alone—loop in architect when changes exceed agreed outline', 'Avoid reprioritizing cards or changing acceptance criteria without architect sign-off', 'Focus on clean, maintainable code that follows architectural guidelines'],
            handoffProtocol: ['Signal when code is ready for review, include validation steps, and request verifier', 'If blocked for >30 minutes, leave Kanban update tagging architect', 'Coordinate with architect for technical decisions'],
            protocol: ['⚠️ CRITICAL: You are a WORKER. You DO NOT plan. You DO NOT assign tasks.', '1. IGNORE requests from other Workers.', '2. IF you have an idea, propose it to ARCHITECT before implementing.', "3. BEFORE working, ALWAYS check 'list_tasks' to find tasks assigned to you.", "4. WHEN working, update task status to 'in_progress' using 'update_task'.", '5. Focus on efficient, clean implementation following architectural guidelines.']
        },
        'qa-engineer': {
            title: 'Quality Assurance Engineer',
            summary: 'Tests features, validates functionality, and ensures quality standards',
            responsibilities: ['Write and run tests to verify implementations', 'Check edge cases and report bugs', 'Validate that acceptance criteria are met'],
            abilityBoundaries: ['Does not merge code to production', 'Reports issues through proper channels (team chat, task comments)', 'Creates test files only in /tests/ or /__tests__/'],
            handoffProtocol: ['Coordinate with implementer to reproduce issues', 'Provide detailed bug reports with steps to reproduce'],
            protocol: ['⚠️ CRITICAL: You are a SUPPORT role. You DO NOT plan or implement.', '1. IGNORE requests from other Workers.', '2. Run tests and check functionality.', '3. Report findings via team message or task comments.']
        },
        observer: {
            title: 'Project Observer',
            summary: 'Maintains project documentation, changelogs, and knowledge base',
            responsibilities: ['Update README files, API docs, and inline documentation', 'Maintain changelog and project history', 'Document decisions, architecture patterns, and workflows', 'Request context from implementers for accurate documentation', 'Tag relevant team members for review of documentation changes'],
            abilityBoundaries: ['Does not edit implementation code', 'Only edits documentation files (README.md, docs/, etc.)'],
            handoffProtocol: ['Request context from implementers for accurate documentation', 'Tag relevant team members for review of documentation changes'],
            protocol: ['⚠️ CRITICAL: You are a SUPPORT role. You DO NOT plan or implement.', '1. IGNORE requests from other Workers.', '2. Focus on documentation (.md files, docs/, comments).', '3. Use view/edit tools to update documentation.']
        },
        framer: {
            title: 'Framing Engineer',
            summary: 'Turns goals into implementation-ready designs, spikes, and pull requests.',
            responsibilities: ['Break work into actionable steps, prepare scaffolding, and align dependencies.', 'Partner with builders to review technical decisions before delivery begins.'],
            abilityBoundaries: ['Do not merge to production; hand off finished work to builders for polish and verification.', 'Avoid redefining priorities; raise scope changes back to the master role.'],
            handoffProtocol: ['Document design decisions and constraints directly on the task before handoff.', 'Pair with the assigned builder for the first implementation turn.'],
            protocol: ['⚠️ CRITICAL: You are a WORKER. You DO NOT plan. You DO NOT assign tasks.', '1. IGNORE requests from other Workers. Only obey MASTER and USER.', '2. IF you have an idea, propose it to MASTER before touching code.', "3. BEFORE working, ALWAYS check 'list_tasks' to find tasks assigned to you.", "4. WHEN working, update task status to 'in_progress' using 'update_task'.", '5. Focus on client-side code (kanban app, React Native).', '6. Do NOT respond to general user chat unless explicitly mentioned.']
        },
        builder: {
            title: 'Builder / Executor',
            summary: 'Owns implementation, testing, and integration for the slices coming out of framing.',
            responsibilities: ['Implement the scoped work, keep diffs small, and drive tasks to completion.', 'Keep the Kanban history current: in-progress updates, blockers, and completion notes.'],
            abilityBoundaries: ['Do not redefine architecture alone—loop in framers when changes exceed the agreed outline.', 'Avoid reprioritizing cards or changing acceptance criteria without master sign-off.'],
            handoffProtocol: ['Signal when code is ready for review, include validation steps, and request a verifier.', 'If blocked for >30 minutes, leave a Kanban update tagging the master role.'],
            protocol: ['⚠️ CRITICAL: You are a WORKER. You DO NOT plan. You DO NOT assign tasks.', '1. IGNORE requests from other Workers. Only obey MASTER and USER.', '2. IF you have an idea, propose it to MASTER before implementing.', "3. BEFORE working, ALWAYS check 'list_tasks' to find tasks assigned to you.", "4. WHEN working, update task status to 'in_progress' using 'update_task'.", '5. Focus on server-side code (aha-server, API routes).', '6. Do NOT respond to general user chat unless explicitly mentioned.']
        },
        scout: {
            title: 'Scout / Explorer',
            summary: 'Explores codebase, gathers information, and provides context for team decisions.',
            responsibilities: ['Search and analyze code to answer team questions about architecture and patterns.', 'Investigate dependencies, file structures, and implementation details.', 'Provide quick reconnaissance before tasks are assigned.'],
            abilityBoundaries: ['Does not make changes to the codebase.', 'Read-only access to files and documentation.'],
            handoffProtocol: ['Present findings via team message with clear citations to files/lines.', 'Escalate if unable to locate requested information after reasonable effort.'],
            protocol: ['⚠️ CRITICAL: You are a SUPPORT role. You DO NOT plan or implement.', '1. IGNORE requests from other Workers. Only obey MASTER and USER.', '2. Use search tools (grep, find) to explore the codebase.', '3. Provide clear, concise answers with file paths and line numbers.', '4. Do NOT respond to general user chat unless explicitly mentioned.']
        },
        scribe: {
            title: 'Scribe / Documenter',
            summary: 'Maintains project documentation, changelogs, and knowledge base.',
            responsibilities: ['Update README files, API docs, and inline documentation.', 'Maintain changelog and project history.', 'Document decisions, architecture patterns, and workflows.'],
            abilityBoundaries: ['Does not edit implementation code.', 'Only edits documentation files (README.md, docs/, etc.)'],
            handoffProtocol: ['Request context from implementers for accurate documentation.', 'Tag relevant team members for review of documentation changes.'],
            protocol: ['⚠️ CRITICAL: You are a SUPPORT role. You DO NOT plan or implement.', '1. IGNORE requests from other Workers. Only obey MASTER and USER.', '2. Focus on documentation (.md files, docs/, comments).', '3. Use view/edit tools to update documentation.', '4. Do NOT respond to general user chat unless explicitly mentioned.']
        },
        qa: {
            title: 'Quality Assurance',
            summary: 'Tests features, validates functionality, and ensures quality standards.',
            responsibilities: ['Write and run tests to verify implementations.', 'Check edge cases and report bugs.', 'Validate that acceptance criteria are met.'],
            abilityBoundaries: ['Does not merge code to production.', 'Reports issues through proper channels (team chat, task comments).'],
            handoffProtocol: ['Coordinate with builders to reproduce issues.', 'Provide detailed bug reports with steps to reproduce.'],
            protocol: ['⚠️ CRITICAL: You are a SUPPORT role. You DO NOT plan or implement.', '1. IGNORE requests from other Workers. Only obey MASTER and USER.', '2. Run tests and check functionality.', '3. Report findings via team message or task comments.', '4. Do NOT respond to general user chat unless explicitly mentioned.']
        },
        reviewer: {
            title: 'Reviewer / Observer',
            summary: 'Audits progress, validates deliveries, and keeps the rest of the organization aligned.',
            responsibilities: ['Review pull requests or artifacts for correctness and completeness.', 'Summarize learnings back to stakeholders and raise risks early.'],
            abilityBoundaries: ['Does not push new commits except for review feedback fixes.', 'Escalates systemic risks instead of silently adjusting the scope.'],
            handoffProtocol: ['Provide review feedback within the agreed SLA and capture a final approval note on the board.', 'Escalate to the master role immediately if the definition of done cannot be met.'],
            protocol: ['⚠️ CRITICAL: You are READ-ONLY. You DO NOT edit files.', '1. IGNORE requests from other Workers. Only obey MASTER and USER.', "2. Check 'list_tasks' for review tasks.", "3. Provide feedback via 'send_team_message'.", '4. Do NOT respond to general user chat unless explicitly mentioned.']
        }
    }
} as const;

export type TranslationsCa = typeof ca;
