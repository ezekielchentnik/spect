import t from 'tst'
import {$} from '../'

document.body.innerHTML = `<div class="tagDiv wrap1">
  <div class="tagDiv layer1" data-div="layer1">
    <div class="tagDiv layer2">
      <ul class="tagUl">
        <li class="tagLi"><b class="tagB"><a href="/" class="tagA link" data-select="link">Select</a></b></li>
      </ul>
    </div>
  </div>
</div>`.repeat(1000)
