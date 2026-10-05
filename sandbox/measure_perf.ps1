$sw = [System.Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath "engine\objdir-crush\dist\bin\firefox.exe" -ArgumentList @("-headless", "-no-remote", "-profile", "sandbox\s3_google_signin_drm\profile", "about:blank") -PassThru
$p.WaitForInputIdle(5000) | Out-Null
$sw.Stop()
Write-Host "Cold startup ms: $($sw.ElapsedMilliseconds)"
Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
