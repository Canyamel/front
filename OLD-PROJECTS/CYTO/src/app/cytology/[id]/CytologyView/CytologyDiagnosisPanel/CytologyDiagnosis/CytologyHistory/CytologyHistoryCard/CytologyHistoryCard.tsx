import { Card, Tag, Typography } from "antd";

import { ICytologyHistoryItem } from "@cytology/core/types/cytology";
import { getHighestProbIndex } from "@cytology/core/functions/highestProb";

import { tagColors, TagsKeys, tagTexts } from "./props";

const { Link } = Typography;

type CytologyHistoryCardProps = ICytologyHistoryItem;

const CytologyHistoryCard: React.FC<CytologyHistoryCardProps> = (props) => {
    const tagKey =
        props.prev === null ? TagsKeys.created : props.is_last ? TagsKeys.last : TagsKeys.updated;

    return (
        <Link href={`/cytology/${props.id}`} key={props.id}>
            <Card
                title={new Date(props.diagnos_date).toLocaleDateString()}
                extra={<Tag color={tagColors[tagKey]}>{tagTexts[tagKey]}</Tag>}
                hoverable
            >
                {getHighestProbIndex(props.details.probs)}
            </Card>
        </Link>
    );
};

export default CytologyHistoryCard;
