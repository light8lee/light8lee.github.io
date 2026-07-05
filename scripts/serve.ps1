$ErrorActionPreference = "Stop"

$rubyBin = "C:\Ruby33-x64\bin"
if (Test-Path $rubyBin) {
  $env:Path = "$rubyBin;$env:Path"
}

if (-not (Get-Command bundle -ErrorAction SilentlyContinue)) {
  throw "Bundler was not found. Install Ruby with DevKit, then run this script again."
}

bundle install
bundle exec jekyll serve --livereload --host 127.0.0.1 --port 4000
