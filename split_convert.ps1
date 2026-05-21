$jsonPath = "c:\Users\Pongo\Desktop\Laundry\2026-05-18_DATA_laundry.json"
$json = Get-Content -Path $jsonPath -Raw | ConvertFrom-Json
$half = [Math]::Floor($json.Count / 2)

function Save-Batch($start, $end, $filename) {
    $sql = New-Object System.Text.StringBuilder
    [void]$sql.AppendLine("INSERT INTO `"orders`" (`"id`", `"date`", `"nota`", `"customer`", `"total`", `"items`", `"notes`", `"paymentMethod`", `"isPaid`", `"paidAt`", `"paidInDay`", `"status`", `"paymentHistory`") VALUES")
    
    for ($i = $start; $i -le $end; $i++) {
        $row = $json[$i]
        $id = $row.id
        
        $date = if ($row.date) { "'" + $row.date.ToString().Replace("'", "''") + "'" } else { "NULL" }
        $nota = if ($row.nota) { "'" + $row.nota.ToString().Replace("'", "''") + "'" } else { "NULL" }
        $customer = if ($row.customer) { "'" + $row.customer.ToString().Replace("'", "''") + "'" } else { "NULL" }
        $total = if ($row.total -ne $null) { $row.total } else { 0 }
        
        # Serialize items
        $itemsJson = ConvertTo-Json -InputObject $row.items -Depth 10 -Compress
        $items = "'" + $itemsJson.Replace("'", "''") + "'::jsonb"
        
        $notes = if ($row.notes) { "'" + $row.notes.ToString().Replace("'", "''") + "'" } else { "''" }
        $paymentMethod = if ($row.paymentMethod) { "'" + $row.paymentMethod.ToString().Replace("'", "''") + "'" } else { "NULL" }
        $isPaid = if ($row.isPaid) { "true" } else { "false" }
        $paidAt = if ($row.paidAt) { "'" + $row.paidAt.ToString().Replace("'", "''") + "'" } else { "NULL" }
        $paidInDay = if ($row.paidInDay) { "'" + $row.paidInDay.ToString().Replace("'", "''") + "'" } else { "NULL" }
        $status = if ($row.status) { "'" + $row.status.ToString().Replace("'", "''") + "'" } else { "'PROSES'" }
        
        # Serialize paymentHistory
        if ($row.paymentHistory -and $row.paymentHistory.Count -gt 0) {
            $paymentHistoryJson = ConvertTo-Json -InputObject $row.paymentHistory -Depth 10 -Compress
            $paymentHistory = "'" + $paymentHistoryJson.Replace("'", "''") + "'::jsonb"
        } else {
            $paymentHistory = "'[]'::jsonb"
        }
        
        $comma = if ($i -eq $end) { ";" } else { "," }
        
        [void]$sql.AppendLine("($id, $date, $nota, $customer, $total, $items, $notes, $paymentMethod, $isPaid, $paidAt, $paidInDay, $status, $paymentHistory)$comma")
    }
    
    $sql.ToString() | Out-File -FilePath $filename -Encoding utf8
}

Save-Batch 0 ($half - 1) "c:\Users\Pongo\Desktop\Laundry\insert_backup_part1.sql"
Save-Batch $half ($json.Count - 1) "c:\Users\Pongo\Desktop\Laundry\insert_backup_part2.sql"
