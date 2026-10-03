# Windows only. Starts desktop Chocolate Doom with build/toads.wad merged,
# waits, saves a PNG of the game window to build/run/ and quits the game.
# Lets Claude Code (or you) see what a build looks like without playing it.
#
#   powershell -File scripts/win-screenshot.ps1 -Episode 1 -Map 3 -Skill 4 -Name e1m3
#
# -Iwad picks the base game. -NoWad runs the base game without the mod.
param(
  [string]$Iwad = "iwads\freedoom1.wad",
  [int]$Episode = 1,
  [int]$Map = 1,
  [int]$Skill = 3,
  [int]$Seconds = 5,
  [string]$Name = "shot",
  [switch]$NoWad
)

$root = Split-Path -Parent $PSScriptRoot
$runDir = Join-Path $root "build\run"
New-Item -ItemType Directory -Force $runDir | Out-Null
$exe = Join-Path $root "tools\chocolate-doom\chocolate-doom.exe"
if ($env:CHOCOLATE_DOOM) { $exe = $env:CHOCOLATE_DOOM }

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class GameWindow {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
}
'@

$gameArgs = @('-iwad', (Join-Path $root $Iwad))
$wad = Join-Path $root "build\toads.wad"
if (-not $NoWad -and (Test-Path $wad)) { $gameArgs += @('-merge', $wad) }
$gameArgs += @('-warp', $Episode, $Map, '-skill', $Skill, '-window', '-nogui', '-nosound', '-nograbmouse')
# Start-Process joins arguments with spaces, so quote any that contain one.
$quoted = $gameArgs | ForEach-Object { if ("$_" -match '\s') { "`"$_`"" } else { "$_" } }

$game = Start-Process -FilePath $exe -ArgumentList $quoted -WorkingDirectory $runDir -PassThru
Start-Sleep -Seconds $Seconds
$game.Refresh()
if ($game.HasExited) { Write-Error "the game exited early with code $($game.ExitCode)"; exit 1 }

$rect = New-Object GameWindow+RECT
[void][GameWindow]::GetClientRect($game.MainWindowHandle, [ref]$rect)
$bitmap = New-Object System.Drawing.Bitmap($rect.R, $rect.B)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$hdc = $graphics.GetHdc()
# 3 = client area only + render full content, which GPU-drawn windows need
[void][GameWindow]::PrintWindow($game.MainWindowHandle, $hdc, 3)
$graphics.ReleaseHdc($hdc)
$graphics.Dispose()
$out = Join-Path $runDir "$Name.png"
$bitmap.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Stop-Process -Id $game.Id -Force
Write-Output "saved $out ($($rect.R)x$($rect.B))"
