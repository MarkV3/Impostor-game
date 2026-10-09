$ErrorActionPreference = 'Stop'

$projectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$envFile = Join-Path $projectDirectory '.env'

Write-Host 'In Cloudflare: Networking > Tunnels > your existing tunnel > Overview > Add a replica.'
Write-Host 'Copy its installation command (or just the eyJ... token). Do not run that installation command.'
Write-Host 'Paste it below. The input is hidden, and the command is not executed.'
$secureInput = Read-Host 'Tunnel token or copied installation command' -AsSecureString
$inputPointer = [IntPtr]::Zero

try {
    $inputPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureInput)
    $inputValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($inputPointer)
    $tokenMatch = [regex]::Match($inputValue, 'eyJ[A-Za-z0-9_+/=-]+')
    if (-not $tokenMatch.Success) {
        throw 'No tunnel token found. Copy the command from Add a replica and try again.'
    }
    $tunnelToken = $tokenMatch.Value
    try {
        $decodedToken = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($tunnelToken)) | ConvertFrom-Json
        if (-not $decodedToken.a -or -not $decodedToken.t -or -not $decodedToken.s) {
            throw 'Missing tunnel fields.'
        }
    } catch {
        throw 'This is not a valid Cloudflare tunnel token. Copy the command from Add a replica and try again.'
    }

    $contents = if (Test-Path -LiteralPath $envFile) {
        [IO.File]::ReadAllText($envFile)
    } else {
        [IO.File]::ReadAllText((Join-Path $projectDirectory '.env.example'))
    }
    $contents = $contents.Replace("`r`n", "`n")
    $setting = 'CLOUDFLARE_TUNNEL_TOKEN=' + $tunnelToken
    if ($contents -match '(?m)^CLOUDFLARE_TUNNEL_TOKEN=') {
        $contents = [regex]::Replace($contents, '(?m)^CLOUDFLARE_TUNNEL_TOKEN=.*$', $setting)
    } else {
        $contents = $contents.TrimEnd() + "`n" + $setting + "`n"
    }
    [IO.File]::WriteAllText($envFile, $contents, (New-Object Text.UTF8Encoding($false)))
    Write-Host 'Token saved privately in .env. You can now run npm run host.'
} finally {
    if ($inputPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($inputPointer)
    }
    $inputValue = $null
    $tunnelToken = $null
}
