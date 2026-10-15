' ============================================================================
' TataDana Silent Background Launcher
' Runs autostart-tatadana.bat completely hidden (no console / command prompt popup)
' ============================================================================

Option Explicit
Dim WshShell, fso, targetBat, comspec

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

targetBat = "C:\Users\Performance Edition\.gemini\antigravity\scratch\tatadana\scripts\autostart-tatadana.bat"
comspec = WshShell.ExpandEnvironmentStrings("%COMSPEC%")

If fso.FileExists(targetBat) Then
    ' 0 = vbHide (Hidden window), False = Return immediately without waiting
    WshShell.Run Chr(34) & comspec & Chr(34) & " /c " & Chr(34) & targetBat & Chr(34), 0, False
End If

Set WshShell = Nothing
Set fso = Nothing
