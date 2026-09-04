# PowerShell Conventional Commit Helper
param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

git add -A
git commit -m $Message
