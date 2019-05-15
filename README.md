# label-process-output
Annotate process outputs

```
Usage: node label-process-output.js [OPTONS] COMMAND [...ARGS]
Options:
    +<splitchar><args> split <args> by <splitchar> into multiple arguments
    -l alias of --label
    --label prefix of output.
        For example: --label backup create prefix:
        backup> for stdout
        and
        backup> for stderr
        Default is base name of command.
        Labels can also contains special placeholders: 
                %t will be expanded to timestamp (like 2019-05-15 17:44:25.748)
                %T will be expanded to time (liek 17:44:25.748)
                %% will be replaced single '%'
    -e Print prefixed stdout to stderr and print stdout normally.
        It's handy if stdout is captured like: VAL="$(label-process-output.js md5 "$FILE")"
    -0 Do not print prefixed stdout, neither to stdout or stderr

```
