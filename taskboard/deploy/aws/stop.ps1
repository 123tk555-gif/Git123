# 体験版のサーバー(EC2)を止める。止めている間はサーバーの料金はかからない
# (保存領域 12GB の分だけ、月に約150円かかる)。
# 使い方: aws sso login --profile taskboard のあとで  .\stop.ps1
$ErrorActionPreference = 'Stop'
$Profile_ = 'taskboard'
# AWS CLI が PATH にない画面でも動くように、標準のインストール先も探す
$aws = (Get-Command aws -ErrorAction SilentlyContinue).Source
if (-not $aws) { $aws = 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' }

$id = & $aws ec2 describe-instances --profile $Profile_ --output text `
    --filters 'Name=tag:Project,Values=taskboard' 'Name=instance-state-name,Values=pending,running' `
    --query 'Reservations[0].Instances[0].InstanceId'
if ($LASTEXITCODE -ne 0) { throw 'サーバーの情報を取れませんでした' }
if (-not $id -or $id -eq 'None') { Write-Host '動いているサーバーはありません'; exit 0 }

Write-Host "サーバー $id を止めます..."
& $aws ec2 stop-instances --instance-ids $id --profile $Profile_ | Out-Null
& $aws ec2 wait instance-stopped --instance-ids $id --profile $Profile_
if ($LASTEXITCODE -ne 0) { throw '停止の確認に失敗しました' }
Write-Host '止まりました。'
