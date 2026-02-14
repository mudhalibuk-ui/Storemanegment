
Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this VBS script resides
ScriptPath = FSO.GetParentFolderName(WScript.ScriptFullName)

' Set the working directory to the script path so python can find .env and requirements
WshShell.CurrentDirectory = ScriptPath

' Run python script invisibly (0)
WshShell.Run chr(34) & "python" & chr(34) & " " & chr(34) & "advanced_monitor.py" & chr(34), 0

Set WshShell = Nothing
Set FSO = Nothing
