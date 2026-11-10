# ---------------------------------------------------------------------------
# serve.ps1 — Servidor web local mínimo para probar la web (sin instalar nada)
#
# Uso (desde la carpeta del proyecto):
#   powershell -ExecutionPolicy Bypass -File serve.ps1          -> http://localhost:8080
#   powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 3000
#
# Cómo funciona: usa HttpListener de .NET (viene con Windows). Por cada
# petición GET busca el archivo dentro de esta carpeta y lo devuelve con su
# Content-Type correcto. Para parar: Ctrl+C.
# ---------------------------------------------------------------------------
param([int]$Port = 8080)

$root = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\') + '\'

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.txt'  = 'text/plain; charset=utf-8'
  '.md'   = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Sirviendo $root"
Write-Host "Abre http://localhost:$Port/  (Ctrl+C para parar)"

try {
  while ($listener.IsListening) {
    # GetContextAsync + espera en trozos de 500 ms: así Ctrl+C puede interrumpir.
    $task = $listener.GetContextAsync()
    while (-not $task.AsyncWaitHandle.WaitOne(500)) { }
    $ctx = $task.GetAwaiter().GetResult()
    $req = $ctx.Request
    $res = $ctx.Response

    try {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if (Test-Path -LiteralPath $path -PathType Container) { $path = Join-Path $path 'index.html' }

      # Seguridad: nunca servir nada fuera de la carpeta del proyecto (../../)
      if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
      }
      elseif (Test-Path -LiteralPath $path -PathType Leaf) {
        $bytes = [IO.File]::ReadAllBytes($path)
        $ext = [IO.Path]::GetExtension($path).ToLower()
        $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
        $res.Headers.Add('Cache-Control', 'no-store')   # siempre la última versión al recargar
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      else {
        $res.StatusCode = 404
      }
      Write-Host ("{0} {1} {2}" -f $res.StatusCode, $req.HttpMethod, $req.Url.AbsolutePath)
    }
    catch {
      $res.StatusCode = 500
      Write-Host "500 $($_.Exception.Message)"
    }
    finally {
      $res.Close()
    }
  }
}
finally {
  $listener.Stop()
}
