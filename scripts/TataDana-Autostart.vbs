' ============================================================================
' TataDana Windows Startup Script
' Automatically executed by Windows upon user login/boot.
' Launches the local TataDana server invisibly in the background.
' ============================================================================

Option Explicit
Dim WshShell, fso, targetBat, comspec

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

targetBat = "C:\Users\Performance Edition\.gemini\antigravity\scratch\tatadana\scripts\autostart-tatadana.bat"
comspec = WshShell.ExpandEnvironmentStrings("%COMSPEC%")

If fso.FileExists(targetBat) Then
    ' 0 = vbHide (completely hidden background process), False = do not wait
    WshShell.Run Chr(34) & comspec & Chr(34) & " /c " & Chr(34) & targetBat & Chr(34), 0, False
End If

Set WshShell = Nothing
Set fso = Nothing
