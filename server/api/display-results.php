<?php
if(!ISSET($home)) {
    header('location: ./'); 
    die(); 
}
?>
<div id="results">
    <table>
      <tr>
        <th id="district">Dist</th>
        <th id="contestant">Contestant</th>
        <th id="votes">Votes</th>
      </tr>
<?php
require('includes/database-conn.php');
$config = json_decode(file_get_contents('includes/config.json'), true);
$contestants_arr = array_column($config['entries'], 'name', 'id');

$sql = 'SELECT entry_id, SUM(points) AS count 
        FROM vote_results
        GROUP BY entry_id
        ORDER BY entry_id';

$result = $conn->query($sql);

// get data and echo entry_id, contestants_arr[entry_id], and count
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        echo("<tr>
                <td>{$row['entry_id']}</td>
                <td>{$contestants_arr[$row['entry_id']]}</td>
                <td>" . number_format($row['count']) . "</td>
              </tr>");
    }
} else { // no data to show
    echo('<tr>
            <td class="error">No data</td>
            <td class="error">No data</td>
            <td class="error">No data</td>
          </tr>');
}

$conn->close();    
?>
    </table>
</div>
