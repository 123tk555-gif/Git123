# 体験版のサーバー(EC2)を起動し、公開アドレス(https)を決めて表示する。
# 使い方: aws sso login --profile taskboard のあとで  .\start.ps1
# 起動している間は料金がかかる(t4g.micro で 1時間あたり約2〜3円)。使い終わったら stop.ps1 で止める。
# 止めて起動するたびにサーバーの IP アドレスが変わるので、公開アドレスも毎回変わる。
$ErrorActionPreference = 'Stop'
$Profile_ = 'taskboard'
# AWS CLI が PATH にない画面でも動くように、標準のインストール先も探す
$aws = (Get-Command aws -ErrorAction SilentlyContinue).Source
if (-not $aws) { $aws = 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' }

function Invoke-Aws {
    $out = & $aws @args --profile $Profile_ --output json
    if ($LASTEXITCODE -ne 0) { throw "aws $($args -join ' ') が失敗しました" }
    if ($out) { $out | Out-String | ConvertFrom-Json }
}

$id = (Invoke-Aws ec2 describe-instances --filters 'Name=tag:Project,Values=taskboard' `
        'Name=instance-state-name,Values=pending,running,stopping,stopped' `
        --query 'Reservations[0].Instances[0].InstanceId')
if (-not $id) { throw 'taskboard のサーバーが見つかりません' }

Write-Host "サーバー $id を起動します..."
Invoke-Aws ec2 start-instances --instance-ids $id | Out-Null
& $aws ec2 wait instance-running --instance-ids $id --profile $Profile_
if ($LASTEXITCODE -ne 0) { throw '起動の確認に失敗しました' }
$ip = Invoke-Aws ec2 describe-instances --instance-ids $id --query 'Reservations[0].Instances[0].PublicIpAddress'
$site = ($ip -replace '\.', '-') + '.sslip.io'
Write-Host "サーバーの IP アドレス: $ip"

# サーバーへ指示を送れる(SSM)ようになるまで待つ
for ($i = 0; $i -lt 30; $i++) {
    $ping = Invoke-Aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$id" `
        --query 'InstanceInformationList[0].PingStatus'
    if ($ping -eq 'Online') { break }
    Start-Sleep -Seconds 10
}
if ($ping -ne 'Online') { throw 'サーバーに指示を送れません(しばらく待ってから、もう一度実行してください)' }

# サーバーの中で、最新の設定を取得し、公開ドメインを .env に書いて、アプリを起動する
$commands = @(
    'cd /opt/git123/taskboard',
    'git pull --ff-only || true',
    'touch .env',
    'sed -i /^SITE_ADDRESS=/d .env',
    "echo SITE_ADDRESS=$site >> .env",
    'docker compose -f compose.prod.yaml up -d'
)
$params = @{ commands = $commands } | ConvertTo-Json -Compress
$tmp = Join-Path ([IO.Path]::GetTempPath()) 'taskboard-ssm.json'
[IO.File]::WriteAllText($tmp, $params, (New-Object Text.UTF8Encoding $false))
try {
    $cmdId = Invoke-Aws ssm send-command --instance-ids $id --document-name AWS-RunShellScript `
        --parameters "file://$tmp" --query 'Command.CommandId'
} finally { Remove-Item $tmp }
& $aws ssm wait command-executed --command-id $cmdId --instance-id $id --profile $Profile_
if ($LASTEXITCODE -ne 0) { throw 'サーバー内の起動に失敗しました' }

Write-Host ''
Write-Host "公開アドレス: https://$site/"
Write-Host 'アプリが立ち上がり、証明書が発行されるまで1〜2分待ってから開いてください。'
Write-Host '使い終わったら .\stop.ps1 で止めます。'
