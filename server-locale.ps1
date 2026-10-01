# Piccolo server per provare il sito sul computer, all'indirizzo http://localhost:8080/
# Serve perché alcune funzioni (come l'accesso con Google) non funzionano
# aprendo index.html con il doppio clic.
# Avvio: tasto destro su questo file → "Esegui con PowerShell". Per fermarlo chiudi la finestra.
param([int]$Porta = 8080)

$cartella = $PSScriptRoot
$server = New-Object System.Net.HttpListener
$server.Prefixes.Add("http://localhost:$Porta/")
$server.Start()
Write-Host "Sito disponibile su http://localhost:$Porta/  (chiudi questa finestra per fermarlo)"

$tipi = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json'; '.png' = 'image/png'
  '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
}

while ($server.IsListening) {
  $richiesta = $server.GetContext()
  $risposta = $richiesta.Response
  try {
    $percorso = [Uri]::UnescapeDataString($richiesta.Request.Url.AbsolutePath.TrimStart('/'))
    if ($percorso -eq '' -or $percorso.EndsWith('/')) { $percorso += 'index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $cartella $percorso))
    # Si possono leggere solo i file dentro la cartella del sito
    if ($file.StartsWith($cartella) -and (Test-Path $file -PathType Leaf)) {
      $contenuto = [IO.File]::ReadAllBytes($file)
      $tipo = $tipi[[IO.Path]::GetExtension($file)]
      if (-not $tipo) { $tipo = 'application/octet-stream' }
      $risposta.ContentType = $tipo
      $risposta.Headers.Add('Cache-Control', 'no-store')
      $risposta.OutputStream.Write($contenuto, 0, $contenuto.Length)
    } else {
      $risposta.StatusCode = 404
    }
  } catch {
    $risposta.StatusCode = 500
  } finally {
    $risposta.Close()
  }
}
