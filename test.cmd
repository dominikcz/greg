rmdir x:\projekty\greg-test /s /q
mkdir x:\projekty\greg-test

call npm pack

cd x:\projekty\greg-test

call npx -y ..\greg\dominikcz-greg-0.9.4.tgz init

call npm run dev > a.log 2>&1
pause
