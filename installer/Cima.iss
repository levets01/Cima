; Inno Setup Script for Cima
; Generated for the Windows desktop installer.

#define MyAppName "Cima"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Cima"
#define MyAppExeName "Cima.exe"
#define MyAppID "co.cima.prestamos"

[Setup]
AppId={#MyAppID}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\Cima
DefaultGroupName={#MyAppName}
OutputBaseFilename=Cima-1.0.0-Setup
OutputDir=..\release
PrivilegesRequired=lowest
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
SetupIconFile=..\desktop\resources\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallFilesDir={app}
UsePreviousAppDir=yes
UsePreviousGroup=yes
CreateAppDir=yes
DisableWelcomePage=no
WizardImageFile=..\desktop\resources\wizard.bmp
WizardSmallImageFile=..\desktop\resources\wizard-small.bmp
LicenseFile=
InfoBeforeFile=
ChangesEnvironment=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Accesos directos:"; Flags: checkedonce

[Files]
Source: "..\release\win-unpacked\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\Cima"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconIndex: 0
Name: "{userdesktop}\Cima"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon; IconIndex: 0

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir Cima"; Flags: nowait postinstall skipifsilent unchecked

[UninstallDelete]
Type: filesandordirs; Name: "{localappdata}\Cima"

[Registry]
Root: HKCU; Subkey: "Software\Cima"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
