
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "python" & chr(34) & " " & chr(34) & "advanced_monitor.py" & chr(34), 0
Set WshShell = Nothing
