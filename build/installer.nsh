!macro customInstall
  SetRegView 64
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != 1
    DetailPrint "Installing Microsoft Visual C++ runtime..."
    File "/oname=$TEMP\vc_redist.x64.exe" "${BUILD_RESOURCES_DIR}\vc_redist.x64.exe"
    ExecWait '"$TEMP\vc_redist.x64.exe" /install /quiet /norestart' $1
    DetailPrint "VC++ runtime installer finished with code $1"
    Delete "$TEMP\vc_redist.x64.exe"
  ${EndIf}
!macroend
